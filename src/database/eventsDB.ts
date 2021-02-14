import { Connection, createConnection } from 'typeorm';

var connection: Connection;

createConnection({
    type: 'postgres',
    url: process.env.DATABASE_URL || '',
    ssl: { rejectUnauthorized: false },
    logging: "all",
    logger: "simple-console",
    dropSchema: true
}).then((con) => {console.log("Conectado a la BD"); connection = con;}).catch((err) => console.error(err));

export { connection };