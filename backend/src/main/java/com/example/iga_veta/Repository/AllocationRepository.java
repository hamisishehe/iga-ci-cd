package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.Allocation;
import com.example.iga_veta.Model.Collections;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AllocationRepository extends JpaRepository<Allocation, Long> {

    List<Allocation> findByDateBetween(LocalDateTime startDate, LocalDateTime endDate);


}
