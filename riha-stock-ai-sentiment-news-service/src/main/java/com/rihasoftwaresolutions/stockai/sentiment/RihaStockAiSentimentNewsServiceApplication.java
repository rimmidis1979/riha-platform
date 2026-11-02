package com.rihasoftwaresolutions.stockai.sentiment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RihaStockAiSentimentNewsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(RihaStockAiSentimentNewsServiceApplication.class, args);
    }
}

