package com.rihasoftwaresolutions.stockai.orchestrator;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RihaStockAiOrchestratorApplication {

    public static void main(String[] args) {
        SpringApplication.run(RihaStockAiOrchestratorApplication.class, args);
    }
}

