import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe('SchoolManagementSystem', function () {
    async function deploySchoolManagementSystem() {
        const [owner, addr1, addr2, addr3, addr4, addr5, addr6] = await hre.ethers.getSigners();

        const SMS = await hre.ethers.getContractFactory("SchoolManagementSystem");
        const sms = await SMS.deploy();

        return { owner, addr1, addr2, addr3, addr4, addr5, addr6, sms };
    }

    describe('Deployment', function () {
        it("deployed successfully with owner as principal", async function () {
            const { owner, sms } = await loadFixture(deploySchoolManagementSystem);
            expect(await sms.principal()).to.equal(owner.address);
        });
    });

    describe('SetTuitionFee', function () {
        it('reverts if not called by principal', async function () {
            const { sms, addr1 } = await loadFixture(deploySchoolManagementSystem);
            await expect(sms.connect(addr1).setTuitionFee(1e8)).to.be.revertedWith('Only the principal can call this');
        });

        it('does not revert when called by principal', async function () {
            const { sms } = await loadFixture(deploySchoolManagementSystem);
            await expect(sms.setTuitionFee(1e8)).not.to.be.reverted;
        });

        it('correctly sets the tuition fee', async function () {
            const { sms } = await loadFixture(deploySchoolManagementSystem);
            const newFee = 1e9;
            await sms.setTuitionFee(newFee);
            expect(await sms.tuitionFee()).to.equal(newFee);
        });
    });

    describe('AddTeacher', function () {
        it('reverts if not called by principal', async function () {
            const { sms, addr1, addr4 } = await loadFixture(deploySchoolManagementSystem);
            await expect(sms.connect(addr4).addTeacher(addr1.address, "Rahmah", 16, 2, 1)).to.be.revertedWith('Only the principal can call this');
        });

        it('does not revert when called by principal', async function () {
            const { sms, addr4 } = await loadFixture(deploySchoolManagementSystem);
            await expect(sms.addTeacher(addr4.address, "Rahmah", 16, 2, 1)).not.to.be.reverted;
        });

        it('reverts if teacher already exists', async function () {
            const { sms, addr2 } = await loadFixture(deploySchoolManagementSystem);
            await sms.addTeacher(addr2.address, "Rahmah", 16, 2, 1);
            await expect(sms.addTeacher(addr2.address, "Rahmah", 16, 2, 1)).to.be.revertedWith('Teacher already exists');
        });

        it('increases total teachers count by 1', async function () {
            const { sms, addr2 } = await loadFixture(deploySchoolManagementSystem);
            const initialCount = await sms.totalTeachers();
            await sms.addTeacher(addr2.address, "Rahmah", 16, 2, 1);
            expect(await sms.totalTeachers()).to.equal(initialCount + 1n);
        });

        it('correctly sets teacher details', async function () {
            const { sms, addr2 } = await loadFixture(deploySchoolManagementSystem);
            await sms.addTeacher(addr2.address, "Rahmah", 16, 2, 1);
            const teacher = await sms.teachers(addr2.address);
            expect(teacher.name).to.equal('Rahmah');
            expect(teacher.age).to.equal(16);
            expect(teacher.class).to.equal(2);
            expect(teacher.gender).to.equal(1);
        });

        it('adds new teacher address to teacherAddresses array', async function () {
            const { sms, addr2 } = await loadFixture(deploySchoolManagementSystem);
            await sms.addTeacher(addr2.address, "Rahmah", 16, 2, 1);
            const totalTeachers = await sms.totalTeachers();
            const lastAddress = await sms.teacherAddresses(totalTeachers - 1n);
            expect(lastAddress).to.equal(addr2.address);
        });

        it('emits TeacherAdded event when a new teacher is added', async function () {
            const { sms, addr2 } = await loadFixture(deploySchoolManagementSystem);
            await expect(sms.addTeacher(addr2.address, "Rahmah", 16, 2, 1)).to.emit(sms, 'TeacherAdded').withArgs(addr2.address, 'Rahmah');
        });
    });

    describe('AddStudent', function () {
        it('reverts if not called by principal or teacher', async function () {
            const { sms, addr1, addr3 } = await loadFixture(deploySchoolManagementSystem);
            await sms.addTeacher(addr1.address, "Teacher", 30, 1, 1);
            await expect(sms.connect(addr3).addStudent(addr3.address, "Student", 10, 1)).to.be.revertedWith('Only teachers or the principal');
        });

        it('adds student when called by principal', async function () {
            const { sms, addr1 } = await loadFixture(deploySchoolManagementSystem);
            await expect(sms.addStudent(addr1.address, "John Doe", 15, 1)).not.to.be.reverted;
        });

        it('adds student when called by teacher', async function () {
            const { sms, addr1, addr2 } = await loadFixture(deploySchoolManagementSystem);
            await sms.addTeacher(addr1.address, "Teacher", 30, 1, 1);
            await expect(sms.connect(addr1).addStudent(addr2.address, "Jane Doe", 14, 1)).not.to.be.reverted;
        });
    });

    describe('PayTuitionFee', function () {
        it('reverts if student does not exist', async function () {
            const { sms, addr1 } = await loadFixture(deploySchoolManagementSystem);
            await sms.setTuitionFee(1e18);
            await expect(sms.connect(addr1).payTuitionFee({ value: 1e18 })).to.be.revertedWith('Student not found');
        });

        it('reverts if fee is already paid', async function () {
            const { sms, addr1 } = await loadFixture(deploySchoolManagementSystem);
            await sms.setTuitionFee(1e18);
            await sms.addStudent(addr1.address, "Student", 15, 1);
            await sms.connect(addr1).payTuitionFee({ value: 1e18 });
            await expect(sms.connect(addr1).payTuitionFee({ value: 1e18 })).to.be.revertedWith('Tuition already paid');
        });

        it('correctly updates payment status when fee is paid', async function () {
            const { sms, addr1 } = await loadFixture(deploySchoolManagementSystem);
            await sms.setTuitionFee(1e18);
            await sms.addStudent(addr1.address, "Student", 15, 1);
            await sms.connect(addr1).payTuitionFee({ value: 1e18 });
            const student = await sms.students(addr1.address);
            expect(student.paymentStatus).to.equal(1); // PaymentStatus.Paid
        });
    });
   
});