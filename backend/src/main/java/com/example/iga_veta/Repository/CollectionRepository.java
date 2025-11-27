package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.Collections;
import com.example.iga_veta.Model.Customer;
import com.example.iga_veta.Model.GfsCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CollectionRepository extends JpaRepository<Collections,Long> {

    List<Collections> findAllByCentres_Name(String centresName);

    @Query("SELECT c FROM Collections c WHERE c.gfs_code.code = :code")
    List<Collections> findCollectionsByGfsCode(@Param("code") String code);

    @Query("SELECT SUM(c.amount) FROM Collections c WHERE c.gfs_code.code = :code")
    BigDecimal getTotalAmountByGfsCode(@Param("code") String code);

    @Query("SELECT MAX(c.createdAt) FROM Collections c")
    LocalDateTime findlastDate();

    @Query("SELECT MAX(c.date) FROM Collections c")
    Optional<LocalDateTime> findLastFetchedDate();
    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN TRUE ELSE FALSE END " +
            "FROM Collections c " +
            "WHERE c.customer = :customer " +
            "AND c.gfs_code = :gfsCode " +
            "AND c.control_number = :controlNumber")
    boolean existsByCustomerAndGfsCodeAndControlNumber(@Param("customer") Customer customer,
                                                       @Param("gfsCode") GfsCode gfsCode,
                                                       @Param("controlNumber") String controlNumber);
    @Query("SELECT c FROM Collections c WHERE c.centres.name = :centreName")
    List<Collections> findByCentreName(@Param("centreName") String centreName);

    @Query("SELECT SUM(c.amount) FROM Collections c WHERE c.centres.name = :centreName AND c.gfs_code.code = :gfsCode")
    BigDecimal getTotalAmountByCentreAndGfsCode(@Param("centreName") String centreName,
                                                @Param("gfsCode") String gfsCode);


    @Query("SELECT c FROM Collections c WHERE c.date BETWEEN :startDate AND :endDate")
    List<Collections> findByDateBetween(LocalDateTime startDate, LocalDateTime endDate);







}
