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
  const dbo = client.db(process.env.DBNAME);
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
          // don't process classes from sources not supported
          if (!classSources.includes(classItem.source)) return null;
          // merge class features into one structure
          const newClassFeatures = classItem?.classFeatures.map((feature) => {
            if (typeof feature === "string") {
              let values = feature.split("|");
              values[2] = _.isEmpty(values[2]) ? "PHB" : values[2];
              values[4] = _.isEmpty(values[4]) ? values[2] : values[4];
              // don't process class features from sources not supported
              if (
                !classSources.includes(values[2]) ||
                !classSources.includes(values[4])
              )
                return null;
              return {
                gainSubclassFeature: false,
                ..._.find(classFeatures, {
                  name: values[0],
                  className: values[1],
                  classSource: values[2],
                  level: parseInt(values[3]),
                }),
              };
            } else {
              let values = feature.classFeature.split("|");
              values[2] = _.isEmpty(values[2]) ? "PHB" : values[2];
              values[4] = _.isEmpty(values[4]) ? values[2] : values[4];
              // don't process class features from sources not supported
              if (
                !classSources.includes(values[2]) ||
                !classSources.includes(values[4])
              )
                return null;
              return {
                gainSubclassFeature: feature.gainSubclassFeature,
                ..._.find(classFeatures, {
                  name: values[0],
                  className: values[1],
                  classSource: values[2],
                  level: parseInt(values[3]),
                }),
              };
            }
          });
          // merge subclass features into one structure
          const newSubclass = classItem?.subclasses?.map((subclass) => {
            // don't process classes from sources not supported
            if (!classSources.includes(subclass.source)) return null;
            // now loop through subclassFeatures array
            const newFeatures = subclass?.subclassFeatures?.map((feature) => {
              let values = feature.split("|");
              values[4] = _.isEmpty(values[4]) ? "PHB" : values[4];
              // don't process class features from sources not supported
              if (!classSources.includes(values[4])) return null;
              return {
                ..._.find(subclassFeatures, {
                  name: values[0],
                  className: values[1],
                  subclassSource: values[4],
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
            id: `${classItem.name.replace(/\W/g, "")}-${classItem?.source}-${
              classItem?.page
            }`.toLowerCase(),
            ...classItem,
            classFeatures: !_.isEmpty(newClassFeatures)
              ? newClassFeatures.filter((o) => o)
              : [],
            subclasses: !_.isEmpty(newSubclass)
              ? newSubclass.filter((o) => o)
              : [],
          };
        });
        await Promise.all(
          newClassItems
            .filter((o) => o)
            .map(async (item) => {
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
