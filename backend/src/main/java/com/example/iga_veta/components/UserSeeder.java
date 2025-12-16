package com.example.iga_veta.components;

import com.example.iga_veta.Model.*;
import com.example.iga_veta.Repository.CentreRepository;
import com.example.iga_veta.Repository.DepartmentRepository;
import com.example.iga_veta.Repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class UserSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CentreRepository centreRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    public UserSeeder(UserRepository userRepository,
                      CentreRepository centreRepository,
                      DepartmentRepository departmentRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.centreRepository = centreRepository;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {


            List<Centre> centres = centreRepository.findAll();
            List<Department> departments = departmentRepository.findAll();

            // Create User seeder class
            //app
            User admin = new User();
            admin.setFirstName("hamis");
            admin.setMiddleName("S.");
            admin.setLastName("Shafii");
            admin.setUserName("admin");
            admin.setEmail("admin@veta.go.tz");
            admin.setPhoneNumber("1234567890");
            admin.setPassword(passwordEncoder.encode("password123"));
            admin.setRole(User.Role.ADMIN);
            admin.setUserType(User.UserType.CENTRE);
            admin.setStatus(User.Status.ACTIVE);
            admin.setCentres(centres.get(0));
            admin.setDepartments(departments.get(0));

            userRepository.save(admin);

            System.out.println("✅ Seeded initial user data.");
        }
    }
}
