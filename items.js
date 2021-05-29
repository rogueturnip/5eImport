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
  const responseItems = await axios.get("https://5e.tools/data/items.json");
  const responseItemsFluff = await axios.get(
    "https://5e.tools/data/fluff-items.json"
  );
  try {
    const items = responseItems.data.item;
    const fluff = responseItemsFluff.data.itemFluff;
    console.log(`count items ${items.length} fluff ${fluff.length}`);
    const newItems = await Promise.all(
      items.map((item) => {
        let itemFluff = {};
        if (item.hasFluffImages) {
          itemFluff = _.find(fluff, { name: item.name });
        }
        return {
          id: `${item.name.replace(/\W/g, "")}-${item.source}-${
            item.page
          }`.toLowerCase(),
          base: false,
          // ..._.merge(item, itemFluff),
          ...item,
          images: itemFluff?.images || [],
          entriesFluff: itemFluff?.entries || [],
        };
      })
    );
    return newItems;
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
        await dbo.collection("items").updateOne(query, update, options);
      })
    );
  } catch (e) {
    // Deal with the fact the chain failed
    console.log(e);
  } finally {
    await client.close();
  }
})();
