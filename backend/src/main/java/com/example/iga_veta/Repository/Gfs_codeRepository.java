package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.GfsCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface Gfs_codeRepository extends JpaRepository<GfsCode,Long> {

    Optional<GfsCode> findByCode(String code);

}
