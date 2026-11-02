package com.rihasoftwaresolutions.stockai.backtest;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RihaStockAiBacktestEngineApplication {

    public static void main(String[] args) {
        SpringApplication.run(RihaStockAiBacktestEngineApplication.class, args);
    }
}
