package com.rihasoftwaresolutions.stockai.orchestrator.repository;

import com.rihasoftwaresolutions.stockai.orchestrator.entity.GlobalTradingSettingsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GlobalTradingSettingsRepository extends JpaRepository<GlobalTradingSettingsEntity, String> {
}

