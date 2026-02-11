package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.Collections;
import com.example.iga_veta.Model.Customer;
import com.example.iga_veta.Model.GfsCode;
import com.example.iga_veta.Repository.projections.ServiceSummaryView;
import com.example.iga_veta.Repository.projections.TotalsView;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CollectionRepository extends JpaRepository<Collections, Long> {

    // -------------------- existing queries (UPDATED to amountBilled) --------------------


    boolean existsByControlNumberAndGfsCode_CodeAndCentre_IdAndDateAndDescriptionAndAmountBilled(
            String controlNumber,
            String code,
            Long centreId,
            LocalDateTime date,
            String description,
            java.math.BigDecimal amountBilled
    );

    @Query("SELECT c FROM Collections c WHERE c.gfsCode.code = :code")
    List<Collections> findCollectionsByGfsCode(@Param("code") String code);

    @Query("SELECT COALESCE(SUM(c.amountBilled), 0) FROM Collections c WHERE c.gfsCode.code = :code")
    BigDecimal getTotalAmountByGfsCode(@Param("code") String code);

    @Query("SELECT MAX(c.createdAt) FROM Collections c")
    LocalDateTime findlastDate();

    @Query("SELECT MAX(c.date) FROM Collections c")
    Optional<LocalDateTime> findLastFetchedDate();

    @Query("""
        SELECT CASE WHEN COUNT(c) > 0 THEN TRUE ELSE FALSE END
        FROM Collections c
        WHERE c.customer = :customer
          AND c.gfsCode = :gfsCode
          AND c.controlNumber = :controlNumber
    """)
    boolean existsByCustomerAndGfsCodeAndControlNumber(
            @Param("customer") Customer customer,
            @Param("gfsCode") GfsCode gfsCode,
            @Param("controlNumber") String controlNumber
    );

    @Query("SELECT c FROM Collections c WHERE c.centre.name = :centreName")
    List<Collections> findByCentreName(@Param("centreName") String centreName);

    @Query("""
        SELECT COALESCE(SUM(c.amountBilled), 0)
        FROM Collections c
        WHERE c.centre.name = :centreName
          AND c.gfsCode.code = :gfsCode
    """)
    BigDecimal getTotalAmountByCentreAndGfsCode(
            @Param("centreName") String centreName,
            @Param("gfsCode") String gfsCode
    );

    @Query("SELECT c FROM Collections c WHERE c.date >= :startDate AND c.date < :endDate")
    List<Collections> findByDateBetween(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    // ✅ UPDATED dedupe to amountBilled (matches your service)
    boolean existsByControlNumberAndGfsCode_CodeAndCentre_IdAndDateAndAmountBilled(
            String controlNumber,
            String gfsCode,
            Long centreId,
            LocalDateTime date,
            BigDecimal amountBilled
    );

    // -------------------- DASHBOARD FAST QUERIES (UPDATED to amountBilled) --------------------

    @Query("""
        select coalesce(sum(c.amountBilled), 0), count(c)
        from Collections c
        where c.date >= :start and c.date < :end
          and (:centreName is null or c.centre.name = :centreName)
    """)
    List<Object[]> totals(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName
    );

    @Query("""
        select
          coalesce(c.gfsCode.code, 'N/A'),
          coalesce(c.gfsCode.description, ''),  
          coalesce(sum(c.amountBilled), 0)
        from Collections c
        where c.date >= :start and c.date < :end
          and (:centreName is null or c.centre.name = :centreName)
        group by c.gfsCode.code, c.gfsCode.description
        order by sum(c.amountBilled) desc
    """)
    List<Object[]> topServices(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            Pageable pageable
    );

    @Query("""
        select
          c.centre.name,
          coalesce(sum(c.amountBilled), 0)
        from Collections c
        where c.date >= :start and c.date < :end
        group by c.centre.name
        order by sum(c.amountBilled) desc
    """)
    List<Object[]> topCenters(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable
    );

    @Query("""
        select
          c.centre.name,
          coalesce(sum(c.amountBilled), 0)
        from Collections c
        where c.date >= :start and c.date < :end
        group by c.centre.name
        order by sum(c.amountBilled) asc
    """)
    List<Object[]> bottomCenters(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable
    );

    @Query("""
        select
          coalesce(c.customer.name, 'Unknown'),
          coalesce(c.centre.name, 'No Center'),
          coalesce(c.customer.centre.zones.name, '-'),
          coalesce(c.gfsCode.code, 'N/A'),
          coalesce(c.gfsCode.description, ''),
          c.amountBilled,
          c.date
        from Collections c
        order by c.date desc
    """)
    List<Object[]> recentPayments(Pageable pageable);

    // -------------------- collection report page (UPDATED filters + amountBilled) --------------------

    @Query("""
      select 
        c.id as id,
        coalesce(c.customer.name, 'N/A') as customerName,
        coalesce(c.centre.name, 'N/A') as centreName,
        coalesce(c.centre.zones.name, 'N/A') as zoneName,
        coalesce(c.gfsCode.code, 'N/A') as serviceCode,
        coalesce(c.paymentType, '') as paymentType,    
        coalesce(c.controlNumber, '') as controlNumber,    
        coalesce(c.gfsCode.description, 'N/A') as serviceDesc,
        c.amountBilled as amount,
        coalesce(c.amountPaid, 0) as amountPaid,
        c.date as datePaid
      from Collections c
      where c.date >= :start and c.date < :end
        and (:centre is null or c.centre.name = :centre)
        and (:zone is null or c.centre.zones.name = :zone)
        and (:service is null or c.gfsCode.description = :service)
      order by c.date desc
    """)
    org.springframework.data.domain.Page<CollectionRowView> reportRows(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centre") String centre,
            @Param("zone") String zone,
            @Param("service") String service,
            org.springframework.data.domain.Pageable pageable
    );

    @Query("""
      select coalesce(sum(c.amountBilled),0), count(c)
      from Collections c
      where c.date >= :start and c.date < :end
        and (:centre is null or c.centre.name = :centre)
        and (:zone is null or c.centre.zones.name = :zone)
        and (:service is null or c.gfsCode.description = :service)
    """)
    List<Object[]> reportTotals(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centre") String centre,
            @Param("zone") String zone,
            @Param("service") String service
    );

    @Query("""
      select
        coalesce(c.gfsCode.code, 'N/A'),
        coalesce(c.gfsCode.description, 'N/A'),
        coalesce(sum(c.amountPaid),0)
      from Collections c
      where c.date >= :start and c.date < :end
        and (:centre is null or c.centre.name = :centre)
        and (:zone is null or c.centre.zones.name = :zone)
        and (:service is null or c.gfsCode.description = :service)
      group by c.gfsCode.code, c.gfsCode.description
      order by sum(c.amountPaid) desc
    """)
    List<Object[]> reportSummaryByService(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centre") String centre,
            @Param("zone") String zone,
            @Param("service") String service
    );

    // -------------------- typed projections (UPDATED to amountBilled) --------------------

    @Query("""
      select
        coalesce(sum(c.amountBilled), 0) as totalIncome,
        count(c) as totalTransactions
      from Collections c
      where c.date >= :start and c.date < :end
        and (:centreName is null or c.centre.name = :centreName)
    """)
    TotalsView totalsView(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName
    );

    @Query("""
      select
        coalesce(c.gfsCode.code, 'N/A') as serviceCode,
        coalesce(c.gfsCode.description, 'N/A') as serviceDesc,
        coalesce(sum(c.amountPaid), 0) as total
      from Collections c
      where c.date >= :start and c.date < :end
        and (:centreName is null or c.centre.name = :centreName)
        and (:zoneName is null or c.centre.zones.name = :zoneName)
      group by c.gfsCode.code, c.gfsCode.description
      order by sum(c.amountPaid) desc
    """)
    List<ServiceSummaryView> summaryByService(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            @Param("zoneName") String zoneName
    );

    @Query("""
      select
        coalesce(sum(c.amountBilled), 0) as totalIncome,
        count(c) as totalTransactions
      from Collections c
      where c.date >= :start and c.date < :end
        and (:centreName is null or c.centre.name = :centreName)
        and (:zoneName is null or c.centre.zones.name = :zoneName)
    """)
    TotalsView totals(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            @Param("zoneName") String zoneName
    );

    // -------------------- options (no change) --------------------

    @Query("""
        select distinct c.centre.name
        from Collections c
        where c.centre.name is not null
        order by c.centre.name asc
    """)
    List<String> centreOptions();

    @Query("""
        select distinct c.centre.zones.name
        from Collections c
        where c.centre.zones.name is not null
        order by c.centre.zones.name asc
    """)
    List<String> zoneOptions();

    @Query("""
        select distinct c.gfsCode.code, c.gfsCode.description
        from Collections c
        where c.gfsCode.code is not null
        order by c.gfsCode.description asc
    """)
    List<Object[]> serviceOptions();

    // -------------------- totals with centre+zone+serviceCode filters (UPDATED) --------------------

    @Query("""
      select
        coalesce(sum(c.amountBilled), 0) as totalIncome,
        count(c) as totalTransactions,
        coalesce(sum(c.amountPaid), 0) as totalPaid
      from Collections c
      where c.date >= :start and c.date < :end
        and (:centre is null or c.centre.name = :centre)
        and (:zone is null or c.centre.zones.name = :zone)
        and (:serviceCode is null or c.gfsCode.code = :serviceCode)
    """)
    TotalsView totalsView(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centre") String centre,
            @Param("zone") String zone,
            @Param("serviceCode") String serviceCode
    );

    @Query("""
      select coalesce(sum(c.amountBilled), 0)
      from Collections c
      where c.date >= :start and c.date < :end
        and (:centre is null or c.centre.name = :centre)
        and (:zone is null or c.centre.zones.name = :zone)
        and (:serviceCode is null or c.gfsCode.code = :serviceCode)
    """)
    BigDecimal totalAmount(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centre") String centre,
            @Param("zone") String zone,
            @Param("serviceCode") String serviceCode
    );




    @Query(value = """
    select coalesce(sum(t.paid), 0)
    from (
        select
            c.control_number,
            c.date,
            max(coalesce(c.amount_paid, 0)) as paid
        from collections c
        left join centre ce on ce.id = c.centre_id
        left join gfs_code g on g.id = c.gfs_code_id
        where c.date >= :start and c.date < :end
          and (:centre is null or ce.name = :centre)
          and (:serviceCode is null or g.code = :serviceCode)
        group by c.control_number, c.date
    ) t
""", nativeQuery = true)
    BigDecimal totalPaidDistinctByControlAndDateNoZone(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centre") String centre,
            @Param("serviceCode") String serviceCode
    );



}
