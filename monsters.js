import _ from "lodash";
import axios from "axios";
import { default as mongodb } from "mongodb";
import { bestiarySources } from "./supportedSources.js";

import dotenv from "dotenv";
dotenv.config();
const uri = process.env.MONGODB;
const client = new mongodb.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const main = async (filename) => {
  const responseBestiary = await axios.get(
    `https://5e.tools/data/bestiary/${filename}`
  );
  const responseBestiaryFluff = await axios.get(
    `https://5e.tools/data/bestiary/fluff-${filename}`
  );
  const responseLegendaryGroup = await axios.get(
    `https://5e.tools/data/bestiary/legendarygroups.json`
  );
  try {
    const monster = responseBestiary.data.monster;
    const fluff = responseBestiaryFluff.data.monsterFluff;
    const legendaryGroup = responseLegendaryGroup.data.legendaryGroup;
    console.log(
      `counts ${filename} monster ${monster.length} fluff ${fluff.length} legendaryGroup ${legendaryGroup.length}`
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
    const dbo = client.db(process.env.DBNAME);
    const responseIndex = await axios.get(
      "https://5e.tools/data/bestiary/index.json"
    );
    await Promise.allSettled(
      bestiarySources.map(async (source) => {
        const sourceJson = responseIndex.data[source] || null;
        if (sourceJson !== null) {
          const result = await main(sourceJson);
          await Promise.all(
            result.map(async (item) => {
              const query = { id: item.id };
              const update = { $set: item };
              const options = { upsert: true };
              await dbo
                .collection("monsters")
                .updateOne(query, update, options);
            })
          );
        }
      })
    );
  } catch (e) {
    console.log(e);
  } finally {
    await client.close();
  }
})();
