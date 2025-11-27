package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.Zone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ZoneRepository extends JpaRepository<Zone, Long> {

    Optional<Zone> findOneByName(String name);
}
