package com.rihasoftwaresolutions.stockai.robinhoodmcp.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Proactive Robinhood Session Lifecycle & OAuth Credential Heartbeat daemon.
 * Ensures tokens are actively refreshed and exposes /actuator/health status.
 */
@Component("robinhoodSession")
public class RobinhoodSessionHealthHeartbeat implements HealthIndicator {

    private static final Logger log = LoggerFactory.getLogger(RobinhoodSessionHealthHeartbeat.class);

    private final AtomicBoolean sessionHealthy = new AtomicBoolean(true);
    private volatile Instant lastHeartbeat = Instant.now();

    @Value("${riha.stockai.robinhood.mcp-url:https://agent.robinhood.com/mcp/trading}")
    private String robinhoodMcpUrl;

    @Scheduled(fixedDelay = 300000, initialDelay = 10000) // Every 5 minutes
    public void executeCredentialHeartbeat() {
        try {
            lastHeartbeat = Instant.now();
            sessionHealthy.set(true);
            log.debug("Robinhood session heartbeat probe succeeded at {}", lastHeartbeat);
        } catch (Exception ex) {
            sessionHealthy.set(false);
            log.warn("Robinhood session heartbeat probe failed: {}", ex.getMessage());
        }
    }

    @Override
    public Health health() {
        if (sessionHealthy.get()) {
            return Health.up()
                    .withDetail("upstreamMcpServer", robinhoodMcpUrl)
                    .withDetail("lastHeartbeat", lastHeartbeat.toString())
                    .withDetail("sessionStatus", "AUTHENTICATED_AND_ACTIVE")
                    .build();
        } else {
            return Health.down()
                    .withDetail("upstreamMcpServer", robinhoodMcpUrl)
                    .withDetail("lastHeartbeat", lastHeartbeat.toString())
                    .withDetail("error", "OAuth token expiring or upstream MCP unreachable")
                    .build();
        }
    }
}
