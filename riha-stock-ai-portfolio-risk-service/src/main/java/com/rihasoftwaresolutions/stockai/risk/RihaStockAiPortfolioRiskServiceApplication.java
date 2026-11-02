package com.rihasoftwaresolutions.stockai.risk;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RihaStockAiPortfolioRiskServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(RihaStockAiPortfolioRiskServiceApplication.class, args);
    }
}
