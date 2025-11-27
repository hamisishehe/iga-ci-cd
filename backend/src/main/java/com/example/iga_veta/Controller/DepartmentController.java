package com.example.iga_veta.Controller;


import com.example.iga_veta.Model.Department;
import com.example.iga_veta.Service.DepartmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("api/department")
public class DepartmentController {

    @Autowired
    public DepartmentService departmentService;

    @GetMapping("/get")
    public List<Department> getDepartments() {
        return departmentService.findAll();
    }
}
