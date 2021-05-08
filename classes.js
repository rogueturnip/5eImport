import fs from "fs";
import _ from "lodash";
import { default as mongodb } from "mongodb";

const uri =
  "mongodb+srv://testUser:testPassword@cluster0.vbl9h.mongodb.net/?retryWrites=true&w=majority";
const client = new mongodb.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const main = async () => {
  await client.connect();
  const dbo = client.db("5e");
  const directoryPath =
    "/home/tony/projects/TheGiddyLimit.github.io/data/class";
  const classFiles = fs.readdirSync(directoryPath);
  let classItems = [];
  let classFeatures = [];
  let subclassFeatures = [];
  try {
    await Promise.all(
      classFiles.map(async (classFile) => {
        console.log("class file", classFile);
        if (classFile.startsWith("class")) {
          classItems = JSON.parse(
            fs.readFileSync(`${directoryPath}/${classFile}`, "utf8")
          ).class;
          classFeatures = JSON.parse(
            fs.readFileSync(`${directoryPath}/${classFile}`, "utf8")
          ).classFeature;
          subclassFeatures = JSON.parse(
            fs.readFileSync(`${directoryPath}/${classFile}`, "utf8")
          ).subclassFeature;

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
              classFeatures: !_.isEmpty(newClassFeatures)
                ? newClassFeatures
                : [],
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
        }
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
