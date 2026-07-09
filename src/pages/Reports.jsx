import React, { useEffect, useState } from 'react';
import { api, download } from '../api/client.js';
import { BarChart, EmployeeGraph } from '../components/Charts.jsx';

export default function Reports(){
  const [data,setData]=useState(null);
  useEffect(()=>{api('/reports/dashboard').then(setData)},[]);
  if(!data) return <div className="loader">Loading reports...</div>;
  return <section className="page"><div className="pageTitle"><div><h2>Reports & Advanced Analytics</h2></div><div className="actions"><button onClick={()=>download('/reports/export?format=xlsx','takora-task-report.xlsx')}>Export Excel</button><button onClick={()=>download('/reports/export?format=pdf','takora-task-report.pdf')}>Export PDF</button><button onClick={()=>download('/reports/export?format=csv','takora-task-report.csv')}>Export CSV</button></div></div><EmployeeGraph data={data.employeePerformance}/><div className="grid2"><BarChart title="Department-wise Completed Tasks" data={data.departmentPerformance.map(d=>({label:d.department,value:d.completed}))}/><BarChart title="Department-wise Overdue" data={data.departmentPerformance.map(d=>({label:d.department,value:d.overdue}))}/></div><div className="tableWrap"><table><thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Total</th><th>Completed</th><th>Pending</th><th>Delayed</th><th>Workload</th><th>Score</th></tr></thead><tbody>{data.employeePerformance.map(e=><tr key={e._id}><td>{e.name}</td><td>{e.role}</td><td>{e.department}</td><td>{e.total}</td><td>{e.completed}</td><td>{e.pending}</td><td>{e.delayed}</td><td>{e.workload}</td><td>{e.productivityScore}%</td></tr>)}</tbody></table></div></section>;
}
