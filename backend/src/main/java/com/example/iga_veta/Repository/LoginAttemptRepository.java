package com.example.iga_veta.Repository;

import com.example.iga_veta.Model.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginAttemptRepository extends JpaRepository<LoginAttempt,Long> {

}
