// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

contract SchoolManagementSystem {
    address public immutable principal;
    uint32 public totalStudents;
    uint8 public totalTeachers;
    uint256 public tuitionFee;
    uint32 public activeStudentsCount;

    mapping(address => Student) public students;
    mapping(address => Teacher) public teachers;
    address[] public studentAddresses;
    address[] public teacherAddresses;

    enum PaymentStatus { Pending, Paid }
    enum Grade { Grade_I, Grade_II, Grade_III, Grade_IV, Grade_V }
    enum Gender { Male, Female }

    struct Student {
        string name;
        uint32 age;
        uint32 id;
        Grade grade;
        PaymentStatus paymentStatus;
        Gender gender;
    }

    struct Teacher {
        string name;
        uint32 age;
        Grade class;
        Gender gender;
    }

    event StudentAdded(address indexed studentAddress, string name);
    event TeacherAdded(address indexed teacherAddress, string name);
    event TuitionFeePaid(address indexed studentAddress, string name, uint256 fee);
    event TuitionFeeSet(uint256 indexed fee);
    event TeacherRemoved(address indexed teacherAddress, string name);
    event StudentRemoved(address indexed studentAddress, string name);

    constructor() {
        principal = msg.sender;
    }

    modifier onlyPrincipal() {
        require(msg.sender == principal, "Only the principal can call this");
        _;
    }

    modifier teachersAndPrincipal() {
        require(msg.sender == principal || teachers[msg.sender].age != 0, "Only teachers or the principal");
        _;
    }

    function setTuitionFee(uint256 _fee) public onlyPrincipal {
        tuitionFee = _fee;
        emit TuitionFeeSet(_fee);
    }

    function addTeacher(address _addr, string memory _name, uint32 _age, Grade _class, Gender _gender) public onlyPrincipal {
        require(teachers[_addr].age == 0, "Teacher already exists");
        totalTeachers++;
        teachers[_addr] = Teacher(_name, _age, _class, _gender);
        teacherAddresses.push(_addr);
        emit TeacherAdded(_addr, _name);
    }

    function addStudent(address _addr, string memory _name, uint32 _age, Gender _gender) public teachersAndPrincipal {
        require(students[_addr].age == 0, "Student already exists");
        totalStudents++;
        students[_addr] = Student(_name, _age, totalStudents, teachers[msg.sender].class, PaymentStatus.Pending, _gender);
        studentAddresses.push(_addr);
        emit StudentAdded(_addr, _name);
    }

    function removeTeacher(address _addr) public onlyPrincipal {
        require(teachers[_addr].age != 0, "Teacher not found");
        totalTeachers--;
        delete teachers[_addr];
        _removeFromArray(teacherAddresses, _addr);
        emit TeacherRemoved(_addr, teachers[_addr].name);
    }

    function removeStudent(address _addr) public teachersAndPrincipal {
        require(students[_addr].age != 0, "Student not found");
        totalStudents--;
        delete students[_addr];
        _removeFromArray(studentAddresses, _addr);
        emit StudentRemoved(_addr, students[_addr].name);
    }

    function payTuitionFee() public payable {
        require(students[msg.sender].age != 0, "Student not found");
        require(students[msg.sender].paymentStatus == PaymentStatus.Pending, "Tuition already paid");
        require(msg.value == tuitionFee, "Incorrect tuition fee");
        students[msg.sender].paymentStatus = PaymentStatus.Paid;
        activeStudentsCount++;
        emit TuitionFeePaid(msg.sender, students[msg.sender].name, msg.value);
    }

    function getActiveStudents() public view returns(Student[] memory) {
        uint8 count = 0;
        for (uint i = 0; i < studentAddresses.length; i++) {
            if (students[studentAddresses[i]].paymentStatus == PaymentStatus.Paid) count++;
        }
        Student[] memory result = new Student[](count);
        uint j = 0;
        for (uint i = 0; i < studentAddresses.length; i++) {
            if (students[studentAddresses[i]].paymentStatus == PaymentStatus.Paid) {
                result[j] = students[studentAddresses[i]];
                j++;
            }
        }
        return result;
    }

    function removeInactiveStudents() public onlyPrincipal {
        for (uint i = studentAddresses.length; i > 0; i--) {
            address _addr = studentAddresses[i - 1];
            if (students[_addr].paymentStatus != PaymentStatus.Paid) {
                removeStudent(_addr);
            }
        }
    }

    function getBalance() public view returns(uint) {
        return address(this).balance;
    }

    function getStudent(address _addr) public view returns (Student memory) {
        return students[_addr];
    }

    function getTeacher(address _addr) public view returns (Teacher memory) {
        return teachers[_addr];
    }

    function withdraw() public onlyPrincipal {
        payable(principal).transfer(address(this).balance);
    }

    function _removeFromArray(address[] storage array, address _addr) private {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == _addr) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }
}