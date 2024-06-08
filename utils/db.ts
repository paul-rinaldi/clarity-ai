import * as lancedb from "vectordb";
import { Schema, Field, Float32, FixedSizeList, Int32, Float16 } from "apache-arrow";

let db: any;

export const setupDB = async () => {
    const lancedb = require("vectordb");
    const URI = "data/perplexity-lancedb";

    db = await lancedb.connect(URI);
};

type tableData = Array<any>;
/*
    [
        { vector: [3.1, 4.1], item: "foo", price: 10.0 },
        { vector: [5.9, 26.5], item: "bar", price: 20.0 },
    ]
*/
export const createTable = async (tableName: string, data: tableData) => {
    const tbl = await db.createTable(
        tableName,
        data,
        { writeMode: lancedb.WriteMode.Overwrite }
    );

    return tbl;
};

export const dropTable = async (table: string) => {
    await db.dropTable(table);
};

export const searchTable = async (table: lancedb.LocalTable) => {
    const results = await table.search([0.1, 0.3]).limit(20).execute();

    return results;
};