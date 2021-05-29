# 5eImport

This tool is designed to import the great JSON files from the 5e.tools data into a MongoDB collection. It combines all the files that would be related to the data being imported so items can be stored as a single document.
It also creates a unique id based on the name-source-page of the item.

Specific sources can be selected in the import using the arrays in supportedSources.js

The original JSON has not been modified to allow for easy updates into the database and to allow more generic parsing and rendering to be possible.

Currently support

- bestiary
- items and items base
- spells
- races
- classes

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

## Thanks to the 5e Tools team for some great data to work with. https://5e.tools
