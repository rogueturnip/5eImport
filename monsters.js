import fs from "fs";
import _ from "lodash";
import { default as mongodb } from "mongodb";
// import * as parser from "./parser.js";

const uri =
  "mongodb+srv://testUser:testPassword@cluster0.vbl9h.mongodb.net/?retryWrites=true&w=majority";
// "mongodb+srv://user:password@127.0.0.1/?retryWrites=true&w=majority";
const client = new mongodb.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const main = async (filename) => {
  const directoryPath =
    "/home/tony/projects/TheGiddyLimit.github.io/data/bestiary";
  const monsterFile = `${directoryPath}/bestiary-${filename}.json`;
  const fluffFile = `${directoryPath}/fluff-bestiary-${filename}.json`;
  const legendaryGroupsFile = `${directoryPath}/legendarygroups.json`;
  try {
    const monster = JSON.parse(fs.readFileSync(monsterFile, "utf8")).monster;
    const fluff = JSON.parse(fs.readFileSync(fluffFile, "utf8")).monsterFluff;
    const legendaryGroup = JSON.parse(
      fs.readFileSync(legendaryGroupsFile, "utf8")
    ).legendaryGroup;
    console.log(
      `counts monster ${monster.length} fluff ${fluff.length} legendaryGroup ${legendaryGroup.length}`
    );
    const newMonster = await Promise.all(
      monster.map((item) => {
        let lairActions = [];
        let regionalEffects = [];
        let mythicEncounter = [];
        let itemFluff = {};
        if (item.hasFluff || item.hasFluffImages) {
          itemFluff = _.find(fluff, { name: item.name });
        }
        if (!_.isEmpty(item.legendaryGroup)) {
          const findGroup = _.find(legendaryGroup, {
            name: item.name,
            source: item.source,
          });
          lairActions = findGroup?.lairActions || [];
          regionalEffects = findGroup?.regionalEffects || [];
          mythicEncounter = findGroup?.mythicEncounter || [];
        }
        item["saves"] = item.save || {};
        return {
          id: `${item.name.replace(/\W/g, "")}-${item.source}-${
            item.page
          }`.toLowerCase(),
          ..._.omit(item, ["save"]),
          images: itemFluff.images || [],
          entriesFluff: itemFluff.entries || [],
          lairActions,
          regionalEffects,
          mythicEncounter,
        };
      })
    );
    return newMonster;
  } catch (error) {
    console.log(error);
    throw new Error(Error);
  }
};

(async () => {
  try {
    await client.connect();
    const dbo = client.db("5e");
    var text = await main("mm");
    await Promise.all(
      text.map(async (item) => {
        const query = { id: item.id };
        const update = { $set: item };
        const options = { upsert: true };
        await dbo.collection("monsters").updateOne(query, update, options);
      })
    );
  } catch (e) {
    console.log(e);
  } finally {
    await client.close();
  }
})();
