"""
Test suite for authentication and core API endpoints
Tests: Auth (login, register, me), Dashboard stats, Classes, Teachers, Students, Chat
"""
import pytest
import requests
import uuid

class TestAuthentication:
    """Authentication endpoint tests"""

    def test_principal_login_success(self, base_url, api_client):
        """Test principal login with correct credentials"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "principal@school.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token missing in response"
        assert "user" in data, "User data missing in response"
        assert data["user"]["email"] == "principal@school.com"
        assert data["user"]["role"] == "principal"
        assert data["user"]["is_approved"] == True

    def test_login_invalid_credentials(self, base_url, api_client):
        """Test login with invalid credentials"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "principal@school.com",
            "password": "WrongPassword"
        })
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]

    def test_login_nonexistent_user(self, base_url, api_client):
        """Test login with non-existent email"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "nonexistent@school.com",
            "password": "SomePassword"
        })
        assert response.status_code == 401

    def test_teacher_registration(self, base_url, api_client):
        """Test teacher self-registration flow"""
        unique_email = f"TEST_teacher_{uuid.uuid4().hex[:8]}@school.com"
        response = api_client.post(f"{base_url}/api/auth/register", json={
            "name": "Test Teacher",
            "email": unique_email,
            "password": "TestPass123"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "approval" in data["message"].lower()
        assert "user_id" in data

    def test_get_current_user(self, base_url, api_client, auth_headers):
        """Test /api/auth/me endpoint"""
        response = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == "principal@school.com"

    def test_unauthorized_access(self, base_url, api_client):
        """Test accessing protected endpoint without token"""
        response = api_client.get(f"{base_url}/api/auth/me")
        assert response.status_code == 401


class TestDashboard:
    """Dashboard stats endpoint tests"""

    def test_dashboard_stats(self, base_url, api_client, auth_headers):
        """Test dashboard stats endpoint returns correct structure"""
        response = api_client.get(f"{base_url}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        
        data = response.json()
        assert "total_students" in data
        assert "total_teachers" in data
        assert "total_classes" in data
        assert "pending_approvals" in data
        assert "total_sections" in data
        
        # Verify data types
        assert isinstance(data["total_students"], int)
        assert isinstance(data["total_teachers"], int)
        assert isinstance(data["total_classes"], int)
        assert isinstance(data["pending_approvals"], int)
        assert isinstance(data["total_sections"], int)
        
        # Verify seeded data
        assert data["total_classes"] == 10, "Should have 10 classes seeded"
        assert data["total_sections"] == 30, "Should have 30 sections (10 classes × 3 sections)"


class TestAnalytics:
    """School analytics (principal full school; class teacher scoped)"""

    def test_analytics_principal(self, base_url, api_client, auth_headers):
        response = api_client.get(f"{base_url}/api/analytics", headers=auth_headers)
        assert response.status_code == 200, f"Analytics failed: {response.text}"
        data = response.json()
        assert data.get("scoped_class_teacher") is False
        assert "date" in data
        assert "total_students" in data
        assert "attendance_today" in data
        at = data["attendance_today"]
        for key in ("marked", "present", "absent", "late", "unmarked", "rate_of_total", "rate_of_marked"):
            assert key in at
        assert "marks" in data
        mk = data["marks"]
        for key in ("graded_entries", "average_percentage", "pass_count", "fail_count", "pass_rate", "fail_rate"):
            assert key in mk
        assert "attendance_trend" in data
        assert len(data["attendance_trend"]) == 7
        assert "class_avg" in data
        assert isinstance(data["class_avg"], list)
        assert "subject_group_avg" in data
        assert "teacher_one_on_one" in data
        assert "faculty" in data
        assert isinstance(data["subject_group_avg"], list)
        assert isinstance(data["teacher_one_on_one"], list)
        assert isinstance(data["faculty"], list)

    def test_class_teacher_analytics(self, base_url, api_client):
        """Scoped analytics for demo class teacher (requires seed)."""
        r = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": "classteacher@schoolhub.demo", "password": "ClassTeacher@123"},
        )
        if r.status_code != 200:
            pytest.skip(f"Class teacher login not available: {r.text}")
        token = r.json().get("token")
        assert token
        headers = {"Authorization": f"Bearer {token}"}
        response = api_client.get(f"{base_url}/api/teachers/my-class-analytics", headers=headers)
        assert response.status_code == 200, response.text
        data = response.json()
        assert data.get("scoped_class_teacher") is True
        assert "scope_label" in data
        assert "attendance_today" in data
        assert "marks" in data


class TestClasses:
    """Class management endpoint tests"""

    def test_get_classes_list(self, base_url, api_client, auth_headers):
        """Test GET /api/classes returns all classes"""
        response = api_client.get(f"{base_url}/api/classes", headers=auth_headers)
        assert response.status_code == 200, f"Get classes failed: {response.text}"
        
        data = response.json()
        assert "classes" in data
        assert len(data["classes"]) == 10, "Should have 10 classes"
        
        # Verify first class structure
        first_class = data["classes"][0]
        assert "id" in first_class
        assert "name" in first_class
        assert "sections_count" in first_class
        assert "student_count" in first_class
        assert first_class["sections_count"] == 3, "Each class should have 3 sections"

    def test_get_class_detail(self, base_url, api_client, auth_headers):
        """Test GET /api/classes/{class_id} returns class details"""
        # First get a class ID
        classes_response = api_client.get(f"{base_url}/api/classes", headers=auth_headers)
        class_id = classes_response.json()["classes"][0]["id"]
        
        # Get class detail
        response = api_client.get(f"{base_url}/api/classes/{class_id}", headers=auth_headers)
        assert response.status_code == 200, f"Get class detail failed: {response.text}"
        
        data = response.json()
        assert "class" in data
        cls = data["class"]
        assert "sections" in cls
        assert "subjects" in cls
        assert "exams" in cls
        assert len(cls["sections"]) == 3, "Should have 3 sections"
        assert len(cls["subjects"]) == 6, "Should have 6 default subjects"

    def test_get_nonexistent_class(self, base_url, api_client, auth_headers):
        """Test GET /api/classes/{class_id} with invalid ID"""
        response = api_client.get(f"{base_url}/api/classes/invalid-id", headers=auth_headers)
        assert response.status_code == 404


class TestTeachers:
    """Teacher management endpoint tests"""

    def test_get_all_teachers(self, base_url, api_client, auth_headers):
        """Test GET /api/teachers"""
        response = api_client.get(f"{base_url}/api/teachers", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "teachers" in data
        assert isinstance(data["teachers"], list)

    def test_get_pending_teachers(self, base_url, api_client, auth_headers):
        """Test GET /api/teachers/pending (principal only)"""
        response = api_client.get(f"{base_url}/api/teachers/pending", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "teachers" in data

    def test_create_teacher_by_principal(self, base_url, api_client, auth_headers):
        """Test POST /api/teachers/create - principal creates teacher"""
        unique_email = f"TEST_created_teacher_{uuid.uuid4().hex[:8]}@school.com"
        response = api_client.post(f"{base_url}/api/teachers/create", 
            headers=auth_headers,
            json={
                "name": "Created Teacher",
                "email": unique_email,
                "password": "TeacherPass123"
            }
        )
        assert response.status_code == 200, f"Create teacher failed: {response.text}"
        
        data = response.json()
        assert "teacher" in data
        teacher = data["teacher"]
        assert teacher["email"] == unique_email.lower(), "Email should be normalized to lowercase"
        assert teacher["role"] == "teacher"
        assert teacher["is_approved"] == True, "Principal-created teachers should be auto-approved"
        
        # Verify teacher exists by fetching approved teachers
        get_response = api_client.get(f"{base_url}/api/teachers/approved", headers=auth_headers)
        teachers = get_response.json()["teachers"]
        assert any(t["email"] == unique_email.lower() for t in teachers), "Created teacher should be in approved list"


class TestStudents:
    """Student management endpoint tests"""

    def test_create_student_and_verify(self, base_url, api_client, auth_headers):
        """Test POST /api/students - create student and verify persistence"""
        # Get a section ID first
        classes_response = api_client.get(f"{base_url}/api/classes", headers=auth_headers)
        class_id = classes_response.json()["classes"][0]["id"]
        
        class_detail_response = api_client.get(f"{base_url}/api/classes/{class_id}", headers=auth_headers)
        section_id = class_detail_response.json()["class"]["sections"][0]["id"]
        
        # Create student
        unique_roll = f"TEST_{uuid.uuid4().hex[:6]}"
        create_response = api_client.post(f"{base_url}/api/students",
            headers=auth_headers,
            json={
                "name": "Test Student",
                "roll_number": unique_roll,
                "section_id": section_id
            }
        )
        assert create_response.status_code == 200, f"Create student failed: {create_response.text}"
        
        student_data = create_response.json()["student"]
        assert student_data["name"] == "Test Student"
        assert student_data["roll_number"] == unique_roll
        student_id = student_data["id"]
        
        # Verify student exists by fetching section detail
        section_response = api_client.get(f"{base_url}/api/sections/{section_id}", headers=auth_headers)
        assert section_response.status_code == 200
        students = section_response.json()["section"]["students"]
        assert any(s["id"] == student_id for s in students), "Created student should appear in section"

    def test_get_students_by_section(self, base_url, api_client, auth_headers):
        """Test GET /api/students?section_id=X"""
        # Get a section ID
        classes_response = api_client.get(f"{base_url}/api/classes", headers=auth_headers)
        class_id = classes_response.json()["classes"][0]["id"]
        
        class_detail_response = api_client.get(f"{base_url}/api/classes/{class_id}", headers=auth_headers)
        section_id = class_detail_response.json()["class"]["sections"][0]["id"]
        
        response = api_client.get(f"{base_url}/api/students?section_id={section_id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "students" in data


class TestChat:
    """Chat group endpoint tests"""

    def test_get_chat_groups(self, base_url, api_client, auth_headers):
        """Test GET /api/chat/groups"""
        response = api_client.get(f"{base_url}/api/chat/groups", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "groups" in data
        assert isinstance(data["groups"], list)

    def test_create_chat_group(self, base_url, api_client, auth_headers):
        """Test POST /api/chat/groups - create group and verify"""
        unique_name = f"TEST_Group_{uuid.uuid4().hex[:6]}"
        create_response = api_client.post(f"{base_url}/api/chat/groups",
            headers=auth_headers,
            json={
                "name": unique_name,
                "member_ids": []
            }
        )
        assert create_response.status_code == 200, f"Create group failed: {create_response.text}"
        
        group_data = create_response.json()["group"]
        assert group_data["name"] == unique_name
        assert "id" in group_data
        group_id = group_data["id"]
        
        # Verify group exists
        get_response = api_client.get(f"{base_url}/api/chat/groups", headers=auth_headers)
        groups = get_response.json()["groups"]
        assert any(g["id"] == group_id for g in groups), "Created group should appear in groups list"
