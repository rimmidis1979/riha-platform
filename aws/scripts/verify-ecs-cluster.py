#!/usr/bin/env python3
import json
import subprocess
import time

CLUSTER = "riha-agentic-ai-cluster"
REGION = "us-east-2"

def get_services():
    out = json.loads(subprocess.check_output(["aws", "ecs", "list-services", "--cluster", CLUSTER, "--region", REGION]))
    arns = out["serviceArns"]
    names = [a.split("/")[-1] for a in arns]
    
    results = []
    for i in range(0, len(names), 10):
        batch = names[i:i+10]
        desc = json.loads(subprocess.check_output(["aws", "ecs", "describe-services", "--cluster", CLUSTER, "--services"] + batch + ["--region", REGION]))
        results.extend(desc["services"])
    return results

def get_service_ips():
    # List all tasks in cluster
    out = json.loads(subprocess.check_output(["aws", "ecs", "list-tasks", "--cluster", CLUSTER, "--region", REGION]))
    task_arns = out["taskArns"]
    if not task_arns:
        return {}
    
    desc = json.loads(subprocess.check_output(["aws", "ecs", "describe-tasks", "--cluster", CLUSTER, "--tasks"] + task_arns[:100] + ["--region", REGION]))
    
    task_map = {}
    enis = []
    for t in desc["tasks"]:
        group = t.get("group", "")
        svc_name = group.replace("service:", "") if group.startswith("service:") else ""
        last_status = t.get("lastStatus", "")
        for att in t.get("attachments", []):
            if att.get("type") == "ElasticNetworkInterface":
                for d in att.get("details", []):
                    if d.get("name") == "networkInterfaceId":
                        eni_id = d["value"]
                        enis.append(eni_id)
                        task_map[eni_id] = {
                            "service": svc_name,
                            "taskArn": t["taskArn"],
                            "status": last_status,
                            "privateIp": ""
                        }
                    if d.get("name") == "privateIPv4Address":
                        if enis:
                            task_map[enis[-1]]["privateIp"] = d["value"]
    
    # Query ENIs for public IPs
    eni_public = {}
    for i in range(0, len(enis), 50):
        batch = enis[i:i+50]
        net_out = json.loads(subprocess.check_output(["aws", "ec2", "describe-network-interfaces", "--network-interface-ids"] + batch + ["--region", REGION]))
        for nic in net_out["NetworkInterfaces"]:
            nid = nic["NetworkInterfaceId"]
            pub_ip = nic.get("Association", {}).get("PublicIp", "N/A")
            eni_public[nid] = pub_ip
            
    service_endpoints = {}
    for eni_id, data in task_map.items():
        svc = data["service"]
        data["publicIp"] = eni_public.get(eni_id, "N/A")
        service_endpoints[svc] = data
    return service_endpoints

if __name__ == "__main__":
    services = get_services()
    endpoints = get_service_ips()
    
    print("| Service Name | Status | Desired | Running | Pending | Service Connect DNS | Public IP Endpoint |")
    print("|---|---|---|---|---|---|---|")
    for s in sorted(services, key=lambda x: x["serviceName"]):
        name = s["serviceName"]
        status = s["status"]
        desired = s["desiredCount"]
        running = s["runningCount"]
        pending = s["pendingCount"]
        dns = f"{name}.riha.internal"
        ep_info = endpoints.get(name, {})
        pub_ip = ep_info.get("publicIp", "Provisioning...")
        health = "HEALTHY" if running == desired and running > 0 else "STARTING"
        print(f"| `{name}` | **{health}** | {desired} | {running} | {pending} | `{dns}` | `{pub_ip}` |")
