# 5eImport

This tool is designed to import the great JSON files from the 5e.tools data into a MongoDB collection. It combines all the files that would be related to the data being imported so items can be stored as a single collection.

Specific sources can be selected in the import using the arrays in supportedSources.js

Currently support

- bestiary
- items and items base
- spells
- races
- classes (does not allow selection of sources)

### .ENV file

```
MONGODB="mongodb+srv://user:password@localhost?retryWrites=true&w=majority"
DBNAME="5e"
```

### Running imports

```
npm run items
npm run items-base
npm run spells
npm run monsters
npm run races
npm run classes
```
