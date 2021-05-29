import _ from "lodash";
import axios from "axios";
import { default as mongodb } from "mongodb";
import { spellSources } from "./supportedSources.js";

import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB;
const client = new mongodb.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const main = async (filename) => {
  const responseSpells = await axios.get(
    `https://5e.tools/data/spells/${filename}`
  );
  const responseSpellsFluff = await axios.get(
    `https://5e.tools/data/spells/fluff-${filename}`
  );
  try {
    const spells = responseSpells.data.spell;
    const fluff = responseSpellsFluff.data.spellFluff;
    console.log(
      `counts ${filename} spells ${spells.length} fluff ${fluff.length}`
    );
    const newSpells = await Promise.all(
      spells.map((item) => {
        let itemFluff = {};
        if (item.hasFluff || item.hasFluffImages) {
          itemFluff = _.find(fluff, { name: item.name });
        }
        return {
          id: `${item.name.replace(/\W/g, "")}-${item.source}-${
            item.page
          }`.toLowerCase(),
          ...item,
          images: itemFluff.images || [],
          entriesFluff: itemFluff.entries || [],
        };
      })
    );
    return newSpells;
  } catch (error) {
    throw new Error(Error);
  }
};

(async () => {
  try {
    await client.connect();
    const dbo = client.db(process.env.DBNAME);
    const responseIndex = await axios.get(
      "https://5e.tools/data/spells/index.json"
    );
    await Promise.allSettled(
      spellSources.map(async (source) => {
        const sourceJson = responseIndex.data[source] || null;
        if (sourceJson !== null) {
          const result = await main(sourceJson);
          await Promise.all(
            result.map(async (item) => {
              const query = { id: item.id };
              const update = { $set: item };
              const options = { upsert: true };
              await dbo.collection("spells").updateOne(query, update, options);
            })
          );
        }
      })
    );
  } catch (e) {
    // Deal with the fact the chain failed
    console.log(e);
  } finally {
    await client.close();
  }
})();
