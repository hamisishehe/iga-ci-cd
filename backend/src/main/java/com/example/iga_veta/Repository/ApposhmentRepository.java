package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.Apposhment;
import com.example.iga_veta.Model.Centre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;


@Repository
public interface ApposhmentRepository extends JpaRepository<Apposhment, Long> {

    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END " +
            "FROM Apposhment a " +
            "WHERE a.centres.id = :centreId " +
            "AND a.start_date = :startDate " +
            "AND a.end_date = :endDate")
    Boolean existsApposhment(
            @Param("centreId") Long centreId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    List<Apposhment> findByCentres(Centre centres);

}