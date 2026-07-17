package com.iflytek.astron.console.toolkit.config.jooq;

import com.iflytek.astron.console.toolkit.util.database.dialect.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DbDialectConfig {

    @Value("${api.url.sparkDBType:postgresql}")
    private String sparkDBType;

    @Bean
    public DbDialect dbDialect() {
        DbDialectType type = DbDialectType.fromString(sparkDBType);
        return switch (type) {
            case MYSQL -> new MysqlDialect();
            case POSTGRES -> new PostgresDialect();
        };
    }
}
