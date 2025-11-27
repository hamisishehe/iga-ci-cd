package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.Apposhment;
import com.example.iga_veta.Model.ApposhmentDistribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface ApposhmentDistributionRepository extends JpaRepository<ApposhmentDistribution, Long> {

    List<ApposhmentDistribution> findAllByApposhments(Apposhment apposhments);

    @Query(value = """
            SELECT SUM(ad.amount)
            FROM apposhment_distribution ad
            WHERE ad.apposhment_id = :apposhmentId
            """, nativeQuery = true)
    BigDecimal getTotalAmountByApposhmentId(@Param("apposhmentId") Long apposhmentId);

}
