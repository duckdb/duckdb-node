import * as duckdb from '..';
import * as assert from 'assert';
import {TableData} from "..";

describe('user_agent', () => {

    it('default value', (done) => {
        const db: duckdb.Database = new duckdb.Database(':memory:');

        db.all('PRAGMA USER_AGENT', (err: null | Error, rows: TableData) => {
            if (err) {
                done(new Error('Query failed unexpectedly'));
            }
            assert.match(rows[0].user_agent, /duckdb\/.*\(*\) nodejs/);
            done();
        });
    })

    it('with custom_user_agent', (done) => {
        const db: duckdb.Database = new duckdb.Database(':memory:', { 'custom_user_agent': 'a_framework' });

        db.all('PRAGMA USER_AGENT', (err: null | Error, rows: TableData) => {
            if (err) {
                done(new Error('Query failed unexpectedly'));
            }
            assert.match(rows[0].user_agent, /duckdb\/.*\(*\) nodejs a_framework/);
            done();
        });
    })
})
