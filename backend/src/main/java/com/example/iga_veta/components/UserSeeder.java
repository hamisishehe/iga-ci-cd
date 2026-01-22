package com.example.iga_veta.components;

import com.example.iga_veta.Model.Centre;
import com.example.iga_veta.Model.Department;
import com.example.iga_veta.Model.User;
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

        List<Centre> centres = centreRepository.findAll();
        List<Department> departments = departmentRepository.findAll();

        if (centres.isEmpty() || departments.isEmpty()) {
            System.out.println("❌ Centres or Departments not found. User seeding aborted.");
            return;
        }

        /* ===================== ADMIN USER ===================== */
        if (userRepository.findByUserName("admin").isEmpty()) {

            User admin = new User();
            admin.setFirstName("Hamis");
            admin.setMiddleName("S.");
            admin.setLastName("Shafii");
            admin.setUserName("admin");
            admin.setEmail("admin@veta.go.tz");
            admin.setPhoneNumber("1234567890");
            admin.setPassword(passwordEncoder.encode("password123"));
            admin.setRole(User.Role.ADMIN);
            admin.setUserType(User.UserType.HQ);
            admin.setStatus(User.Status.ACTIVE);
            admin.setCentres(centres.get(0));
            admin.setDepartments(departments.get(0));

            userRepository.save(admin);
            System.out.println("✅ ADMIN user created");
        } else {
            System.out.println("ℹ️ ADMIN user already exists");
        }

        /* ===================== STAFF USER ===================== */
        if (userRepository.findByUserName("staff").isEmpty()) {

            User staff = new User();
            staff.setFirstName("John");
            staff.setMiddleName("M.");
            staff.setLastName("Doe");
            staff.setUserName("staff");
            staff.setEmail("staffadmin@veta.go.tz");
            staff.setPhoneNumber("0987654321");
            staff.setPassword(passwordEncoder.encode("123456"));
            staff.setRole(User.Role.ADMIN);
            staff.setUserType(User.UserType.HQ);
            staff.setStatus(User.Status.ACTIVE);
            staff.setCentres(centres.get(0));
            staff.setDepartments(departments.get(0));

            userRepository.save(staff);
            System.out.println("✅ STAFF user created");
        } else {
            System.out.println("ℹ️ STAFF user already exists");
        }
    }
}
