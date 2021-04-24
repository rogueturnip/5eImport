import fs from "fs";
import _ from "lodash";
import { default as mongodb } from "mongodb";

const uri =
  "mongodb+srv://testUser:mongo.cattle.60@cluster0.vbl9h.mongodb.net/?retryWrites=true&w=majority";
const client = new mongodb.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const main = async () => {
  const directoryPath = "/home/tony/projects/TheGiddyLimit.github.io/data";
  const itemsFile = `${directoryPath}/items-base.json`;
  try {
    const items = JSON.parse(fs.readFileSync(itemsFile, "utf8")).baseitem;
    console.log(`count ${items.length}`);
    const newItems = await Promise.all(
      items.map((item) => {
        return {
          id: `${item.name.replace(/\W/g, "")}-${item.source}-${
            item.page
          }`.toLowerCase(),
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
    const dbo = client.db("5e");
    var text = await main("mm");
    await Promise.all(
      text.map(async (item) => {
        const query = { id: item.id };
        const update = { $set: item };
        const options = { upsert: true };
        await dbo.collection("itemsBase").updateOne(query, update, options);
      })
    );
  } catch (e) {
    // Deal with the fact the chain failed
    console.log(e);
  } finally {
    await client.close();
  }
})();
