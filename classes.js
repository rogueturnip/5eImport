import _ from "lodash";
import axios from "axios";
import { default as mongodb } from "mongodb";
import { classSources } from "./supportedSources.js";

import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB;
const client = new mongodb.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const main = async () => {
  await client.connect();
  const dbo = client.db("5e");
  const responseIndex = await axios.get(
    `https://5e.tools/data/class/index.json`
  );
  const classFiles = Object.values(responseIndex.data);
  try {
    await Promise.all(
      classFiles.map(async (classFile) => {
        console.log("class file", classFile);
        const responseClass = await axios.get(
          `https://5e.tools/data/class/${classFile}`
        );
        const classItems = responseClass.data.class || [];
        const classFeatures = responseClass.data.classFeature || [];
        const subclassFeatures = responseClass.data.subclassFeature || [];

        const newClassItems = classItems.map((classItem) => {
          // merge class features into one structure
          const newClassFeatures = classItem?.classFeatures.map((feature) => {
            if (typeof feature === "string") {
              const values = feature.split("|");
              return {
                gainSubclassFeature: false,
                ..._.find(classFeatures, {
                  name: values[0],
                  className: values[1],
                  classSource: _.isEmpty(values[2]) ? "PHB" : values[2],
                  level: parseInt(values[3]),
                }),
              };
            } else {
              const values = feature.classFeature.split("|");
              return {
                gainSubclassFeature: feature.gainSubclassFeature,
                ..._.find(classFeatures, {
                  name: values[0],
                  className: values[1],
                  classSource: _.isEmpty(values[2]) ? "PHB" : values[2],
                  level: parseInt(values[3]),
                }),
              };
            }
          });
          // merge subclass features into one structure
          const newSubclass = classItem?.subclasses?.map((subclass) => {
            // now loop through subclassFeatures array
            const newFeatures = subclass?.subclassFeatures?.map((feature) => {
              const values = feature.split("|");
              return {
                ..._.find(subclassFeatures, {
                  name: values[0],
                  className: values[1],
                  subclassSource: _.isEmpty(values[4]) ? "PHB" : values[4],
                  subclassShortName: values[3],
                  level: parseInt(values[5]),
                }),
              };
            });
            return {
              ...subclass,
              subclassFeatures: _.isEmpty(newFeatures) ? [] : newFeatures,
            };
          });
          return {
            id: `${classItem.name.replace(/\W/g, "")}-${classItem.source}-${
              classItem.page
            }`.toLowerCase(),
            ...classItem,
            classFeatures: !_.isEmpty(newClassFeatures) ? newClassFeatures : [],
            subclasses: !_.isEmpty(newSubclass) ? newSubclass : [],
          };
        });
        await Promise.all(
          newClassItems.map(async (item) => {
            console.log(item.id);
            const query = { id: item.id };
            const update = { $set: item };
            const options = { upsert: true };
            await dbo.collection("classes").updateOne(query, update, options);
          })
        );
      })
    );
  } catch (error) {
    throw new Error(error);
  }
};

(async () => {
  try {
    await main();
  } catch (e) {
    // Deal with the fact the chain failed
    console.log(e);
  } finally {
    await client.close();
  }
})();
