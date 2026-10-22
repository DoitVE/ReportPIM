Set objExcel = CreateObject("Excel.Application")
objExcel.Visible = True' Cambia in True se vuoi vedere Excel mentre lavora
Set objWorkbook = objExcel.Workbooks.Open("C:\Users\952192\OneDrive - Gruppo Ferrovie Dello Stato\AMPC\006 MONITORAGGI\DIFFETTI ARMAMENTO\REPORT\02 Base dati report\00_SCRIPT.xlsm")
objExcel.Run "aggiorna_tabelle_report"  ' Nome della tua macro
objWorkbook.Close False
objExcel.Quit
Set objWorkbook = Nothing
Set objExcel = Nothing
objExcel.Quit