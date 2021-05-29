import _ from "lodash";
import axios from "axios";
import { default as mongodb } from "mongodb";

import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB;
const client = new mongodb.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const main = async () => {
  const responseItems = await axios.get("https://5e.tools/data/races.json");
  const responseItemsFluff = await axios.get(
    "https://5e.tools/data/fluff-races.json"
  );
  try {
    const races = responseItems.data.race;
    const fluff = responseItemsFluff.data.raceFluff;
    console.log(`count items ${races.length} fluff ${fluff.length}`);
    const newRaces = await Promise.all(
      races.map((item) => {
        let itemFluff = {};
        if (item.hasFluff) {
          itemFluff = _.find(fluff, { name: item.name, source: item.source });
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
    return newRaces;
  } catch (error) {
    throw new Error(error);
  }
};

(async () => {
  try {
    await client.connect();
    const dbo = client.db("5e");
    var text = await main();
    await Promise.all(
      text.map(async (item) => {
        const query = { id: item.id };
        const update = { $set: item };
        const options = { upsert: true };
        await dbo.collection("races").updateOne(query, update, options);
      })
    );
  } catch (e) {
    // Deal with the fact the chain failed
    console.log(e);
  } finally {
    await client.close();
  }
})();
