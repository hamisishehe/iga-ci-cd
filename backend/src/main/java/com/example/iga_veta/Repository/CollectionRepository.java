package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.Collections;
import com.example.iga_veta.Model.Customer;
import com.example.iga_veta.Model.GfsCode;
import com.example.iga_veta.Repository.projections.ServiceSummaryView;
import com.example.iga_veta.Repository.projections.TotalsView;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CollectionRepository extends JpaRepository<Collections, Long> {

    // -------------------- existing queries --------------------


    @Query("SELECT c FROM Collections c WHERE c.gfsCode.code = :code")
    List<Collections> findCollectionsByGfsCode(@Param("code") String code);

    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM Collections c WHERE c.gfsCode.code = :code")
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
        SELECT COALESCE(SUM(c.amount), 0)
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

    boolean existsByControlNumberAndGfsCode_CodeAndCentre_IdAndDateAndAmount(
            String controlNumber,
            String gfsCode,
            Long centreId,
            LocalDateTime date,
            BigDecimal amount
    );

    // -------------------- DASHBOARD FAST QUERIES --------------------

    /**
     * ✅ totals for selected range (today/yesterday/month)
     * returns: [total_income(BigDecimal), total_tx(Long)]
     *
     * IMPORTANT: return List<Object[]> so you get row = [sum, count]
     * instead of nested [[sum, count]]
     */
    @Query("""
        select coalesce(sum(c.amount), 0), count(c)
        from Collections c
        where c.date >= :start and c.date < :end
          and (:centreName is null or c.centre.name = :centreName)
    """)
    List<Object[]> totals(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName
    );

    // top services (range)
    @Query("""
        select
          coalesce(c.gfsCode.code, 'N/A'),
          coalesce(c.gfsCode.description, ''),
          coalesce(sum(c.amount), 0)
        from Collections c
        where c.date >= :start and c.date < :end
          and (:centreName is null or c.centre.name = :centreName)
        group by c.gfsCode.code, c.gfsCode.description
        order by sum(c.amount) desc
    """)
    List<Object[]> topServices(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            Pageable pageable
    );

    // month-only centers (top)
    @Query("""
        select
          c.centre.name,
          coalesce(sum(c.amount), 0)
        from Collections c
        where c.date >= :start and c.date < :end
        group by c.centre.name
        order by sum(c.amount) desc
    """)
    List<Object[]> topCenters(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable
    );

    // month-only centers (bottom)
    @Query("""
        select
          c.centre.name,
          coalesce(sum(c.amount), 0)
        from Collections c
        where c.date >= :start and c.date < :end
        group by c.centre.name
        order by sum(c.amount) asc
    """)
    List<Object[]> bottomCenters(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable
    );

    // recent payments (latest 8)
    @Query("""
        select
          coalesce(c.customer.name, 'Unknown'),
          coalesce(c.centre.name, 'No Center'),
          coalesce(c.customer.centre.zones.name, '-'),
          coalesce(c.gfsCode.code, 'N/A'),
          coalesce(c.gfsCode.description, ''),
          c.amount,
          c.date
        from Collections c
        order by c.date desc
    """)
    List<Object[]> recentPayments(Pageable pageable);



    //for collection page

    @Query("""
      select 
        c.id as id,
        coalesce(c.customer.name, 'N/A') as customerName,
        coalesce(c.centre.name, 'N/A') as centreName,
        coalesce(c.centre.zones.name, 'N/A') as zoneName,
        coalesce(c.gfsCode.code, 'N/A') as serviceCode,
        coalesce(c.gfsCode.description, 'N/A') as serviceDesc,
        c.amount as amount,
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
      select coalesce(sum(c.amount),0), count(c)
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
        coalesce(sum(c.amount),0)
      from Collections c
      where c.date >= :start and c.date < :end
        and (:centre is null or c.centre.name = :centre)
        and (:zone is null or c.centre.zones.name = :zone)
        and (:service is null or c.gfsCode.description = :service)
      group by c.gfsCode.code, c.gfsCode.description
      order by sum(c.amount) desc
    """)
    List<Object[]> reportSummaryByService(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centre") String centre,
            @Param("zone") String zone,
            @Param("service") String service
    );


    @Query("""
    select
      coalesce(sum(c.amount), 0) as totalIncome,
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
      coalesce(sum(c.amount), 0) as total
    from Collections c
    where c.date >= :start and c.date < :end
      and (:centreName is null or c.centre.name = :centreName)
      and (:zoneName is null or c.centre.zones.name = :zoneName)
    group by c.gfsCode.code, c.gfsCode.description
    order by sum(c.amount) desc
""")
    List<ServiceSummaryView> summaryByService(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("centreName") String centreName,
            @Param("zoneName") String zoneName
    );

    @Query("""
  select
    coalesce(sum(c.amount), 0) as totalIncome,
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


    // ✅ options: centres & zones (distinct)
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

    // ✅ options: services (code + desc distinct)
    @Query("""
        select distinct c.gfsCode.code, c.gfsCode.description
        from Collections c
        where c.gfsCode.code is not null
        order by c.gfsCode.description asc
    """)
    List<Object[]> serviceOptions();


    @Query("""
    select
      coalesce(sum(c.amount), 0) as totalIncome,
      count(c) as totalTransactions
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

    // ✅ total amount exactly matching filters
    @Query("""
    select coalesce(sum(c.amount), 0)
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

}
