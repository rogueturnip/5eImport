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
  const responseItems = await axios.get(
    "https://5e.tools/data/items-base.json"
  );
  try {
    const items = responseItems.data.baseitem;
    console.log(`count ${items.length}`);
    const newItems = await Promise.all(
      items.map((item) => {
        return {
          id: `${item.name.replace(/\W/g, "")}-${item.source}-${
            item.page
          }`.toLowerCase(),
          base: true,
          ...item,
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
    const dbo = client.db(process.env.DBNAME);
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
