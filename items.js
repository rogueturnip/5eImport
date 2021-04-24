import fs from "fs";
import _ from "lodash";
import { default as mongodb } from "mongodb";
import * as parser from "./parser.js";

const uri =
  "mongodb+srv://testUser:mongo.cattle.60@cluster0.vbl9h.mongodb.net/?retryWrites=true&w=majority";
const client = new mongodb.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const main = async () => {
  const directoryPath = "/home/tony/projects/TheGiddyLimit.github.io/data";
  const itemsFile = `${directoryPath}/items.json`;
  const fluffFile = `${directoryPath}/fluff-items.json`;
  try {
    const items = JSON.parse(fs.readFileSync(itemsFile, "utf8")).item;
    const fluff = JSON.parse(fs.readFileSync(fluffFile, "utf8")).itemFluff;
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
          ..._.merge(item, itemFluff),
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
    var text = await main("mm");
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
