package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.Centre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CentreRepository extends JpaRepository<Centre, Long> {

    Optional<Centre> getCentreByCode(String code);
    Optional<Centre> getCentreByName(String name);


    @Query("SELECT c.centre FROM Customer c WHERE c.name = :name")
    Centre findCentreByCustomerName(@Param("name") String name);


}
