import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "university-portal-secret-key-2025";

// Verify JWT token from Authorization header
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Restrict to admin role only
export function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Restrict to teacher role only
export function teacherOnly(req, res, next) {
  if (req.user?.role !== "teacher") {
    return res.status(403).json({ error: "Teacher access required" });
  }
  next();
}

// Restrict to student role only
export function studentOnly(req, res, next) {
  if (req.user?.role !== "student") {
    return res.status(403).json({ error: "Student access required" });
  }
  next();
}

// Allow admin or teacher
export function adminOrTeacher(req, res, next) {
  if (req.user?.role !== "admin" && req.user?.role !== "teacher") {
    return res.status(403).json({ error: "Admin or Teacher access required" });
  }
  next();
}
