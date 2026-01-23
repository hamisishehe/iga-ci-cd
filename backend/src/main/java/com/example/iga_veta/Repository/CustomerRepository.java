package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.Centre;
import com.example.iga_veta.Model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer,Long> {
    Optional<Customer> findByName(String fullName);

    Optional<Customer> findByNameAndCentre(String name, Centre centre);

    Optional<Customer> findByNameIgnoreCaseAndCentre_Id(String name, Long centreId);



}
