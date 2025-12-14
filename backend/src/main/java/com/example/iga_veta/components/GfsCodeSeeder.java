package com.example.iga_veta.components;

import com.example.iga_veta.Model.GfsCode;
import com.example.iga_veta.Repository.Gfs_codeRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class GfsCodeSeeder implements CommandLineRunner {

    private final Gfs_codeRepository gfsCodeRepository;

    public GfsCodeSeeder(Gfs_codeRepository gfsCodeRepository) {
        this.gfsCodeRepository = gfsCodeRepository;
    }

    @Override
    public void run(String... args) throws Exception {

        if (gfsCodeRepository.count() == 0) {

            gfsCodeRepository.save(createGfsCode("142301600001", "Vocational Short and Tailor made course fees", "0.4"));
            gfsCodeRepository.save(createGfsCode("142202120086", "Tuition Fees", "0.1"));
            gfsCodeRepository.save(createGfsCode("142201610607", "Miscellaneous receipts", "0.2"));
            gfsCodeRepository.save(createGfsCode("142301610001", "Receipt from Vocational Workshop Production", "0.3"));
            gfsCodeRepository.save(createGfsCode("142201360007", "Receipts from Examination Fees", "0.1"));
            gfsCodeRepository.save(createGfsCode("142202540053", "Receipts from Application Fee", "0.1"));
            gfsCodeRepository.save(createGfsCode("141501070049", "Rent - Government Quarter and Offices", "0.1"));
            gfsCodeRepository.save(createGfsCode("142201530014", "Receipt from Annual Fees", "0.1"));
            gfsCodeRepository.save(createGfsCode("142201230004", "Receipts from Full Registration", "0.1"));
            gfsCodeRepository.save(createGfsCode("0", "Extra amount paid", "0.1"));
            gfsCodeRepository.save(createGfsCode("142201220001", "Receipts from Sale of Tender Document", "0.1"));
            gfsCodeRepository.save(createGfsCode("143101010018", "Fines, Penalties and Forfetures", "0.1"));
            gfsCodeRepository.save(createGfsCode("112011010001", "Payroll/Skills and Development Levy", "0.1"));
            gfsCodeRepository.save(createGfsCode("142202110012", "Salary in Lieu of Notice", "0.1"));
            gfsCodeRepository.save(createGfsCode("142201270030", "Receipt from Inspection Fees", "0.1"));

            System.out.println("✔ GFS Codes seeded successfully.");
        }
    }

    private GfsCode createGfsCode(String code, String description, String markupPercent) {
        GfsCode gfsCode = new GfsCode();
        gfsCode.setCode(code);
        gfsCode.setDescription(description);
        gfsCode.setMarkupPercent(markupPercent);
        return gfsCode;
    }
}