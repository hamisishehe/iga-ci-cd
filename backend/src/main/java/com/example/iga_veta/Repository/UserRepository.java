package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.Centre;
import com.example.iga_veta.Model.Department;
import com.example.iga_veta.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User,Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUserName(String username);

    boolean existsByEmail(String email);

    List<User> findByCentresAndDepartments(Centre centres, Department departments);



}
