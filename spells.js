import fs from "fs";
import _ from "lodash";
import { default as mongodb } from "mongodb";

const uri =
  "mongodb+srv://testUser:testPassword@cluster0.vbl9h.mongodb.net/?retryWrites=true&w=majority";
const client = new mongodb.MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const main = async (filename) => {
  const directoryPath =
    "/home/tony/projects/TheGiddyLimit.github.io/data/spells";
  const spellFile = `${directoryPath}/spells-${filename}.json`;
  const fluffFile = `${directoryPath}/fluff-spells-${filename}.json`;
  try {
    const spells = JSON.parse(fs.readFileSync(spellFile, "utf8")).spell;
    const fluff = JSON.parse(fs.readFileSync(fluffFile, "utf8")).spellFluff;
    console.log(`counts spells ${spells.length} fluff ${fluff.length}`);
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
          // ..._.merge(item, itemFluff),
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
    const dbo = client.db("5e");
    var text = await main("phb");
    await Promise.all(
      text.map(async (item) => {
        const query = { id: item.id };
        const update = { $set: item };
        const options = { upsert: true };
        await dbo.collection("spells").updateOne(query, update, options);
      })
    );
  } catch (e) {
    // Deal with the fact the chain failed
    console.log(e);
  } finally {
    await client.close();
  }
})();
