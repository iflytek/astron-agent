package com.iflytek.astron.console.toolkit.util.database.dialect;

import com.iflytek.astron.console.toolkit.util.database.SqlRenderer;
import org.apache.commons.lang3.StringUtils;
import org.jooq.SQLDialect;

import java.util.ArrayList;
import java.util.List;

/**
 * PostgreSQL dialect implementation. Uses double-quote identifiers, BIGSERIAL, COMMENT ON
 * TABLE/COLUMN, ADD COLUMN IF NOT EXISTS, etc.
 */
public class PostgresDialect implements DbDialect {

    @Override
    public String quoteIdent(String name) {
        String n = SqlRenderer.validateIdent(name);
        return "\"" + n.replace("\"", "\"\"") + "\"";
    }

    @Override
    public String buildCreateTable(String tableName, List<ColumnDef> columns, String tableComment) {
        StringBuilder ddl = new StringBuilder();
        String table = quoteIdent(tableName);

        ddl.append("CREATE TABLE ")
                .append(table)
                .append(" (\n")
                .append("  ")
                .append(quoteIdent("id"))
                .append(" BIGSERIAL PRIMARY KEY,\n")
                .append("  ")
                .append(quoteIdent("uid"))
                .append(" VARCHAR(64) NOT NULL,\n")
                .append("  ")
                .append(quoteIdent("create_time"))
                .append(" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");

        for (ColumnDef col : columns) {
            ddl.append(",\n  ").append(quoteIdent(col.name())).append(" ").append(col.sqlType());
            if (col.notNull()) {
                ddl.append(" NOT NULL");
            }
            if (col.defaultValue() != null) {
                ddl.append(" DEFAULT ").append(col.defaultValue());
            }
        }
        ddl.append("\n);");

        // Table comment
        if (StringUtils.isNotBlank(tableComment)) {
            ddl.append("\nCOMMENT ON TABLE ")
                    .append(table)
                    .append(" IS ")
                    .append(SqlRenderer.quoteLiteral(tableComment))
                    .append(";");
        }

        // System column comments
        ddl.append("\nCOMMENT ON COLUMN ").append(table).append(".").append(quoteIdent("id")).append(" IS 'Primary key id';");
        ddl.append("\nCOMMENT ON COLUMN ").append(table).append(".").append(quoteIdent("uid")).append(" IS 'uid';");
        ddl.append("\nCOMMENT ON COLUMN ").append(table).append(".").append(quoteIdent("create_time")).append(" IS 'Create time';");

        // User column comments
        for (ColumnDef col : columns) {
            if (StringUtils.isNotBlank(col.comment())) {
                ddl.append("\nCOMMENT ON COLUMN ")
                        .append(table)
                        .append(".")
                        .append(quoteIdent(col.name()))
                        .append(" IS ")
                        .append(SqlRenderer.quoteLiteral(col.comment()))
                        .append(";");
            }
        }

        return ddl.toString();
    }

    @Override
    public String buildAddColumn(String tableName, ColumnDef column) {
        StringBuilder sql = new StringBuilder();
        String table = quoteIdent(tableName);
        String col = quoteIdent(column.name());

        sql.append("ALTER TABLE ")
                .append(table)
                .append(" ADD COLUMN IF NOT EXISTS ")
                .append(col)
                .append(" ")
                .append(column.sqlType());
        if (column.notNull()) {
            sql.append(" NOT NULL");
        }
        if (column.defaultValue() != null) {
            sql.append(" DEFAULT ").append(column.defaultValue());
        }
        sql.append("; ");

        if (StringUtils.isNotBlank(column.comment())) {
            sql.append("COMMENT ON COLUMN ")
                    .append(table)
                    .append(".")
                    .append(col)
                    .append(" IS ")
                    .append(SqlRenderer.quoteLiteral(column.comment()))
                    .append("; ");
        }
        return sql.toString();
    }

    @Override
    public String buildDropColumn(String tableName, String columnName) {
        String table = quoteIdent(tableName);
        String col = quoteIdent(columnName);
        return "ALTER TABLE " + table + " DROP COLUMN IF EXISTS " + col + ";";
    }

    @Override
    public String buildModifyColumn(String tableName, ColumnModification mod) {
        StringBuilder sql = new StringBuilder();
        StringBuilder commentSql = new StringBuilder();
        String table = quoteIdent(tableName);
        String fromCol = quoteIdent(mod.oldName());
        String toCol = quoteIdent(mod.newName());

        // Rename if needed
        if (!mod.oldName().equals(mod.newName())) {
            sql.append("ALTER TABLE ")
                    .append(table)
                    .append(" RENAME COLUMN ")
                    .append(fromCol)
                    .append(" TO ")
                    .append(toCol)
                    .append("; ");
        }

        // Build ALTER COLUMN sub-clauses
        List<String> alterClauses = new ArrayList<>();
        if (mod.typeChanged()) {
            alterClauses.add("ALTER COLUMN " + toCol + " SET DATA TYPE " + mod.newSqlType());
        }
        if (mod.newNotNull()) {
            alterClauses.add("ALTER COLUMN " + toCol + " SET NOT NULL");
        } else {
            alterClauses.add("ALTER COLUMN " + toCol + " DROP NOT NULL");
        }
        if (mod.defaultChanged()) {
            alterClauses.add("ALTER COLUMN " + toCol + " SET DEFAULT " + mod.newDefault());
        }

        if (!alterClauses.isEmpty()) {
            sql.append("ALTER TABLE ")
                    .append(table)
                    .append(" ")
                    .append(String.join(", ", alterClauses))
                    .append(";");
        }

        // Comment
        if (mod.commentChanged()) {
            if (StringUtils.isNotBlank(mod.newComment())) {
                commentSql.append(" COMMENT ON COLUMN ")
                        .append(table)
                        .append(".")
                        .append(toCol)
                        .append(" IS ")
                        .append(SqlRenderer.quoteLiteral(mod.newComment()))
                        .append("; ");
            } else {
                commentSql.append(" COMMENT ON COLUMN ")
                        .append(table)
                        .append(".")
                        .append(toCol)
                        .append(" IS NULL; ");
            }
        }

        return sql.append(" ").append(commentSql).toString();
    }

    @Override
    public String buildRenameTable(String oldName, String newName) {
        return "ALTER TABLE " + quoteIdent(oldName) + " RENAME TO " + quoteIdent(newName) + ";";
    }

    @Override
    public String buildTableComment(String tableName, String comment) {
        return "COMMENT ON TABLE " + quoteIdent(tableName) + " IS " + SqlRenderer.quoteLiteral(comment) + ";";
    }

    @Override
    public SQLDialect jooqDialect() {
        return SQLDialect.POSTGRES;
    }
}
