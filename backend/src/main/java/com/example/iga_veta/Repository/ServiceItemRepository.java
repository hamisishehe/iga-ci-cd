package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.Apposhment;
import com.example.iga_veta.Model.ServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface ServiceItemRepository extends JpaRepository<ServiceItem, Long> {

    List<ServiceItem> findAllByApposhment(Apposhment apposhment);

    @Query(value = """
        SELECT s.apposhment_id,
               SUM(s.service_return_profit) as total_service_return_profit,
               SUM(s.agency_fee) as total_agency_fee,
               SUM(s.amount_paid_to_paid) as total_amount_paid_to_paid,
               SUM(s.executors) as total_executors,
               SUM(s.supporters_to_executors) as total_supporters_to_executors
        FROM service_item s
        WHERE s.apposhment_id = :apposhmentId
        GROUP BY s.apposhment_id
        """, nativeQuery = true)
    Object getTotalsByApposhmentId(@Param("apposhmentId") Long apposhmentId);

}
