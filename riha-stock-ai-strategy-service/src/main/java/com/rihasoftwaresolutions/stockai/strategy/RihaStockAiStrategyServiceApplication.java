package com.rihasoftwaresolutions.stockai.strategy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RihaStockAiStrategyServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(RihaStockAiStrategyServiceApplication.class, args);
    }
}
