#!/bin/bash
set -e
PEM="gild3d-app/gild3d-production.pem"
HOST="ubuntu@3.93.100.110"

echo "[1/6] Uploading profile page fix..."
scp -i "$PEM" -o StrictHostKeyChecking=no \
  "gild3d-app/frontend/app/profile/[id]/page.tsx" \
  "$HOST:/home/ubuntu/gild3d-app/frontend/app/profile/[id]/page.tsx"
echo "  OK"

echo "[2/6] Writing admin patch script locally..."
cat > /tmp/patch_admin.py << 'PYEOF'
import sys

ctrl = "/home/ubuntu/gild3d-app/backend/src/controllers/adminController.ts"
with open(ctrl) as f:
    src = f.read()

if "setCompanionRate" not in src:
    fn = (
        "\nexport const setCompanionRate = async (req: AuthRequest, res: Response): Promise<void> => {\n"
        "  try {\n"
        "    const { userId } = req.params;\n"
        "    const body = req.body as any;\n"
        "    const usr = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });\n"
        '    if (!usr || usr.memberType !== "COMPANION") { res.status(404).json({ error: "Companion not found" }); return; }\n'
        '    if (!usr.profile) { res.status(400).json({ error: "No profile" }); return; }\n'
        "    const data: any = {};\n"
        "    if (body.hourlyRate !== undefined) data.hourlyRate = parseFloat(String(body.hourlyRate));\n"
        "    if (body.minBookingHours !== undefined) data.minBookingHours = parseInt(String(body.minBookingHours));\n"
        '    if (body.inCall !== undefined) data.inCall = body.inCall === true || body.inCall === "true";\n'
        '    if (body.outCall !== undefined) data.outCall = body.outCall === true || body.outCall === "true";\n'
        "    await prisma.profile.update({ where: { id: usr.profile.id }, data });\n"
        '    res.json({ message: "Rate updated", hourlyRate: data.hourlyRate });\n'
        "  } catch (e: any) {\n"
        '    res.status(500).json({ error: "Failed to update rate" });\n'
        "  }\n"
        "};\n"
    )
    with open(ctrl, "a") as f:
        f.write(fn)
    print("CONTROLLER: setCompanionRate appended")
else:
    print("CONTROLLER: already present - skipping")

routes = "/home/ubuntu/gild3d-app/backend/src/routes/admin.ts"
with open(routes) as f:
    rsrc = f.read()

if "setCompanionRate" not in rsrc:
    for q in ['"', "'"]:
        old = "} from " + q + "../controllers/adminController" + q + ";"
        new = "  setCompanionRate,\n} from " + q + "../controllers/adminController" + q + ";"
        rsrc = rsrc.replace(old, new)
    rsrc = rsrc.replace(
        "export default router;",
        'router.patch("/companions/:userId/rate", setCompanionRate);\nexport default router;'
    )
    with open(routes, "w") as f:
        f.write(rsrc)
    print("ROUTES: setCompanionRate route added")
else:
    print("ROUTES: already present - skipping")
PYEOF
echo "  OK"

echo "[3/6] Uploading and running admin patch on server..."
scp -i "$PEM" -o StrictHostKeyChecking=no /tmp/patch_admin.py "$HOST:/tmp/patch_admin.py"
ssh -i "$PEM" -o StrictHostKeyChecking=no "$HOST" "python3 /tmp/patch_admin.py"
echo "  OK"

echo "[4/6] Rebuilding backend (this takes ~2 min)..."
ssh -i "$PEM" -o StrictHostKeyChecking=no "$HOST" \
  "cd /home/ubuntu/gild3d-app && docker compose build --no-cache backend 2>&1 | grep -E 'Step|DONE|error|ERROR|Built' && docker compose up -d backend && echo BACKEND_UP"
echo "  OK"

echo "[5/6] Rebuilding frontend (this takes ~3 min)..."
ssh -i "$PEM" -o StrictHostKeyChecking=no "$HOST" \
  "cd /home/ubuntu/gild3d-app && docker compose build --no-cache frontend 2>&1 | grep -E 'Step|DONE|error|ERROR|Built' && docker compose up -d frontend && echo FRONTEND_UP"
echo "  OK"

echo "[6/6] Final verification (waiting 20s for startup)..."
sleep 20
ssh -i "$PEM" -o StrictHostKeyChecking=no "$HOST" "
echo '--- Container status ---'
docker ps --format 'table {{.Names}}\t{{.Status}}'
echo ''
echo '--- HTTP status ---'
curl -s -o /dev/null -w 'Site: HTTP %{http_code}\n' http://localhost/
echo ''
echo '--- Companion rates ---'
curl -s http://localhost/api/profiles | python3 -c 'import sys,json; ps=json.load(sys.stdin)[\"profiles\"]; [print(p[\"displayName\"],\"rate: USD\",p.get(\"hourlyRate\")) for p in ps]'
echo ''
echo '--- Admin rate endpoint (expect 401 not 404) ---'
curl -s -o /dev/null -w 'PATCH /api/admin/companions/x/rate -> HTTP %{http_code}\n' -X PATCH http://localhost/api/admin/companions/x/rate
"
echo ""
echo "=============================="
echo "   DEPLOYMENT COMPLETE"
echo "=============================="