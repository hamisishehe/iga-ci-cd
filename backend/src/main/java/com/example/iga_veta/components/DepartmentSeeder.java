package com.example.iga_veta.components;

import com.example.iga_veta.Model.Department;
import com.example.iga_veta.Repository.DepartmentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DepartmentSeeder implements CommandLineRunner {

    private final DepartmentRepository departmentRepository;

    public DepartmentSeeder(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Override
    public void run(String... args) throws Exception {

        if (departmentRepository.count() == 0) {

            Department ict = new Department();
            ict.setName("ICT");
            departmentRepository.save(ict);

            Department finance = new Department();
            finance.setName("Finance");
            departmentRepository.save(finance);

            System.out.println("✔ Departments seeded: ICT, Finance");
        }
    }
}