import fs from "fs";
import dotenv from "dotenv";

import snowflake from "snowflake-sdk";
import crypto from "crypto";

const env = dotenv.config();
if (env.error) {
    console.error("Error loading .env file:", env.error);
    process.exit(1);
}

class SnowflakeClient {
    constructor() {
        this.connection = null;
    }

    async init() {
        const privateKey = process.env.SF_KEY.replace(/\\n/g, "\n");

        this.connection = snowflake.createConnection({
            account: process.env.SF_ACC,
            username: process.env.SF_USER,
            privateKey: privateKey,
            authenticator: "SNOWFLAKE_JWT",
            warehouse: "SNOWFLAKE_LEARNING_WH",
            database: "PROD",
            schema: "MIDI",
            role: "PROD_RW",
            clientSessionKeepAlive: true,
            loginTimeout: 30,
        });
        return new Promise((resolve, reject) => {
            this.connection.connect((err, conn) => {
                if (err) {
                    console.error("❌ Unable to connect:", err.message);
                    reject(err);
                } else {
                    console.log(
                        "Connecting to Snowflake. successful! \n ----------------------------------"
                    );
                    resolve(conn);
                }
            });
        });
    }

    _formatValue(val, key) {
        if (val === null || val === undefined) return "NULL";
        else if (key === "DATE_CREATED" || key === "DATE_UPDATED") {
            if (typeof val === "number") {
                if (val > 9999999999) {
                    return `TO_TIMESTAMP(${val / 1000})`;
                }
                return `TO_TIMESTAMP(${val})`;
            }
            if (typeof val === "string") {
                return `'${val}'`;
            }
        } else if (typeof val === "string")
            return `'${val.replace(/'/g, "''")}'`;
        else if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
        else if (Array.isArray(val)) {
            return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        } else if (typeof val === "object") {
            console.log(JSON.stringify(val));
            return `'${JSON.stringify(val)}'`;
        }
        return val;
    }

    _execute(sql) {
        return new Promise((resolve, reject) => {
            this.connection.execute({
                sqlText: sql,
                complete: (err, stmt, rows) => {
                    if (err) {
                        console.error("❌ Query error:", err.message);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                },
            });
        });
    }

    async insertMuseScoreScore(data) {
        const arrayFields = [
            "GENRES",
            "INSTRUMENTATIONS",
            "INSTRUMENTS",
            "CATEGORYPAGES",
        ];
        const variantFields = ["SCORESJSON", ...arrayFields];

        const columns = Object.keys(data)
            .map((col) => `"${col}"`)
            .join(", ");

        const selectParts = Object.entries(data)
            .map(([key, val]) => {
                if (variantFields.includes(key)) {
                    try {
                        JSON.parse(JSON.stringify(val));
                    } catch (e) {
                        throw new Error(
                            `Invalid JSON for ${key}: ${e.message}`
                        );
                    }
                    return `PARSE_JSON('${JSON.stringify(val)}')`;
                } else {
                    return this._formatValue(val, key);
                }
            })
            .join(", ");

        const sql = `INSERT INTO PROD.MIDI.MUSESCORE_SCORES (${columns}) SELECT ${selectParts};`;
        return this._execute(sql);
    }

    async deleteMuseScoreScore(whereObj) {
        const where = Object.entries(whereObj)
            .map(([k, v]) => `"${k}" = ${this._formatValue(v)}`)
            .join(" AND ");
        const sql = `DELETE FROM PROD.MIDI.MUSESCORE_SCORES WHERE ${where};`;
        return this._execute(sql);
    }
    async removeAllDataFromTable() {
        const sql = `DELETE FROM PROD.MIDI.MUSESCORE_SCORES;`;
        return this._execute(sql);
    }
}

export const snowflakeClient = new SnowflakeClient();

export const addScoreSf = async (data) => {
    const id =
        typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : crypto.randomBytes(16).toString("hex");
    const dataWithId = { ...data, id };
    const checkSql = `SELECT COUNT(*) AS count FROM PROD.MIDI.MUSESCORE_SCORES WHERE URL = ${snowflakeClient._formatValue(
        data.url
    )};`;
    const checkRes = await snowflakeClient._execute(checkSql);
    if (checkRes[0] && checkRes[0].COUNT > 0) {
        throw new Error(`Score ${data.url} already exists`);
    }
    return await snowflakeClient.insertMuseScoreScore(
        mapToSnowflakeColumns(dataWithId)
    );
};

export const updateIsDownloadScoresSfBatch = async (batch) => {
    const setParts = [
        `IS_DOWNLOAD = CASE ${batch
            .map(
                (s) =>
                    `WHEN URL = '${s.url.replace(/'/g, "''")}' THEN ${
                        s.is_download ? "TRUE" : "FALSE"
                    }`
            )
            .join(" ")} ELSE IS_DOWNLOAD END`,
    ];
    const urls = batch.map((s) => `'${s.url.replace(/'/g, "''")}'`).join(", ");
    const sql = `
        UPDATE PROD.MIDI.MUSESCORE_SCORES
        SET ${setParts.join(", ")}
        WHERE URL IN (${urls});
    `;
    await snowflakeClient._execute(sql);
};

export const insertScoresSfBatchIfNotExists = async (
    batch,
    snowflakeClient
) => {
    if (!batch.length) return;

    const batchWithId = batch.map((data) => ({
        ...data,
        ID:
            typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : crypto.randomBytes(16).toString("hex"),
    }));

    const fields = Object.keys(batchWithId[0]);
    const columns = fields.map((col) => `"${col}"`).join(", ");

    const variantFields = [
        "SCORESJSON",
        "GENRES",
        "INSTRUMENTATIONS",
        "INSTRUMENTS",
        "CATEGORYPAGES",
    ];

    const selectParts = batchWithId
        .map((data) => {
            const values = fields
                .map((key) => {
                    let val = data[key];
                    if (variantFields.includes(key)) {
                        let jsonString;
                        try {
                            jsonString = JSON.stringify(val)
                                .replace(/\\/g, "\\\\") // escape backslash
                                .replace(/'/g, "\\'"); // escape single quote
                        } catch (e) {
                            console.error(
                                "❌ Не валідний JSON:",
                                val,
                                e.message
                            );
                            jsonString = "null";
                        }
                        return `PARSE_JSON('${jsonString}')`;
                    } else if (
                        key === "DATE_CREATED" ||
                        key === "DATE_UPDATED"
                    ) {
                        if (typeof val === "number" && val > 9999999999) {
                            return `TO_TIMESTAMP(${val / 1000})`;
                        } else if (typeof val === "number") {
                            return `TO_TIMESTAMP(${val})`;
                        } else if (typeof val === "string") {
                            return `'${val}'`;
                        }
                    } else if (typeof val === "string")
                        return `'${val.replace(/'/g, "''")}'`;
                    else if (typeof val === "number") return val;
                    else if (typeof val === "boolean")
                        return val ? "TRUE" : "FALSE";
                    else if (val === null) return "NULL";

                    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                })
                .join(", ");
            // WHERE NOT EXISTS для унікальності по URL
            return `SELECT ${values} WHERE NOT EXISTS (SELECT 1 FROM PROD.MIDI.MUSESCORE_SCORES WHERE URL = '${data.URL.replace(
                /'/g,
                "''"
            )}')`;
        })
        .join(" UNION ALL ");

    const sql = `INSERT INTO PROD.MIDI.MUSESCORE_SCORES (${columns}) ${selectParts};`;
    try {
        await snowflakeClient._execute(sql);
        console.log("----------------------------");
        console.log("Inserted to SF DONE!");
        console.log("----------------------------");

        const urls = batch.map((b) => b.URL);
        const sql2 = `SELECT COUNT(*) as cnt FROM PROD.MIDI.MUSESCORE_SCORES WHERE URL IN (${urls
            .map((u) => `'${u.replace(/'/g, "''")}'`)
            .join(",")})`;
        const res = await snowflakeClient._execute(sql2);
        console.log(`Вставлено у БД: ${res[0].CNT} з ${batch.length}`);
        console.log("----------------------------");
    } catch (error) {
        console.log("Insert error", error.message);
    }
};

export const updateScoreSf = async (data) => {
    const { url, ...updateData } = data;

    // const checkSql = `SELECT COUNT(*) AS count FROM PROD.MIDI.MUSESCORE_SCORES WHERE URL = ${snowflakeClient._formatValue(
    //     url
    // )};`;

    // const checkRes = await snowflakeClient._execute(checkSql);

    // if (!checkRes[0] || checkRes[0].COUNT === 0) {
    //     throw new Error(`Score with url:${url} not found`);
    // }

    const arrayFields = [
        "GENRES",
        "INSTRUMENTATIONS",
        "INSTRUMENTS",
        "CATEGORYPAGES",
    ];
    const variantFields = ["SCORESJSON", ...arrayFields];

    const setParts = Object.entries(updateData)
        .map(([k, v]) => {
            const col = toSnowflakeCol(k);
            if (variantFields.includes(col)) {
                try {
                    JSON.parse(JSON.stringify(v));
                } catch (e) {
                    throw new Error(`Invalid JSON for ${col}: ${e.message}`);
                }
                return `"${col}" = PARSE_JSON(?)`;
            } else if (col === "DATE_CREATED" || col === "DATE_UPDATED") {
                return `"${col}" = TO_TIMESTAMP(?)`;
            } else {
                return `"${col}" = ?`;
            }
        })
        .join(", ");

    const values = Object.entries(updateData).map(([k, v]) => {
        const col = toSnowflakeCol(k);
        if (variantFields.includes(col)) {
            return JSON.stringify(v);
        } else if (col === "DATE_CREATED" || col === "DATE_UPDATED") {
            if (typeof v === "number" && v > 9999999999) {
                return v / 1000;
            }
            return v;
        } else {
            return v;
        }
    });
    values.push(url);

    const sql = `UPDATE PROD.MIDI.MUSESCORE_SCORES SET ${setParts} WHERE URL = ?;`;

    return new Promise((resolve, reject) => {
        snowflakeClient.connection.execute({
            sqlText: sql,
            binds: values,
            complete: (err, stmt, rows) => {
                if (err) {
                    console.error("❌ Query error:", err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            },
        });
    });
};

export const getScoresSf = async (
    genre,
    instrumentations,
    instruments,
    page,
    pageSize
) => {
    const offset = (page - 1) * pageSize;

    const where = [
        genre ? `ARRAY_CONTAINS('${genre}'::VARIANT, GENRES)` : null,
        instrumentations
            ? `ARRAY_CONTAINS('${instrumentations}'::VARIANT, INSTRUMENTATIONS)`
            : null,
        instruments
            ? `ARRAY_CONTAINS('${instruments}'::VARIANT, INSTRUMENTS)`
            : null,
        `(IS_DOWNLOAD IS NULL OR IS_DOWNLOAD = FALSE)`,
    ]
        .filter(Boolean)
        .join(" AND ");

    const whereClause = where ? `WHERE ${where}` : "";
    const totalSql = `SELECT COUNT(*) AS total FROM PROD.MIDI.MUSESCORE_SCORES ${whereClause};`;

    const totalRes = await snowflakeClient._execute(totalSql);
    const total = totalRes[0]?.TOTAL || 0;
    const selectSql = `SELECT ID, MUSESCORE_ID, URL, ARTIST, TITLE, PUBLISHER FROM PROD.MIDI.MUSESCORE_SCORES ${whereClause} ORDER BY ID LIMIT ${pageSize} OFFSET ${offset};`;
    const results = await snowflakeClient._execute(selectSql);
    return { total, results };
};

const toSnowflakeCol = (key) => {
    if (key === "difficultyLevel") return "DIFFICULTYLEVEL";
    else if (key === "categoryPages") return "CATEGORYPAGES";
    else return key.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
};

const mapToSnowflakeColumns = (data) => {
    const mapped = {};
    for (const [k, v] of Object.entries(data)) {
        mapped[toSnowflakeCol(k)] = v;
    }
    return mapped;
};
