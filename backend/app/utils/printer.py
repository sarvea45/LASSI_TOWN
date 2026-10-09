import logging
from escpos.printer import Dummy, Usb, Network
from escpos.exceptions import Error as EscposError

logger = logging.getLogger(__name__)

def print_receipt_job(order_data: dict):
    try:
        # For development, use Dummy printer to prevent crashes if hardware is absent
        # Production would use Usb(idVendor, idProduct) or Network(ip)
        p = Dummy()
    except Exception as e:
        logger.warning(f"Failed to connect to printer, using Dummy. Error: {e}")
        p = Dummy()
    
    try:
        # --- KOT (Kitchen Order Ticket) ---
        p.set(align='center', text_type='B', width=2, height=2)
        p.text("KOT\n")
        p.set(align='left', text_type='normal', width=1, height=1)
        p.text(f"Order: {order_data.get('display_id')}\n")
        
        table_no = order_data.get('table_number')
        if table_no:
            p.text(f"Table: {table_no}\n")
        p.text(f"Type: {order_data.get('order_type')}\n")
        p.text("-" * 32 + "\n")
        
        for item in order_data.get('items', []):
            qty = item.get('qty', 1)
            name = item.get('variant_name', 'Unknown')
            notes = item.get('special_notes')
            p.text(f"{qty}x {name}\n")
            if notes:
                p.text(f"   Note: {notes}\n")
                
        p.text("\n\n")
        p.cut()
        
        # --- Customer Bill ---
        p.set(align='center', text_type='B', width=2, height=2)
        p.text("LASSI TOWN\n")
        p.set(align='center', text_type='normal', width=1, height=1)
        p.text("Branch: Main Street\n")
        p.text("GSTIN: 29ABCDE1234F1Z5\n")
        p.text("-" * 32 + "\n")
        
        p.set(align='left')
        p.text(f"Order: {order_data.get('display_id')}\n")
        p.text(f"Payment: {order_data.get('payment_method')}\n")
        p.text("-" * 32 + "\n")
        
        for item in order_data.get('items', []):
            qty = item.get('qty', 1)
            name = item.get('variant_name', 'Unknown')
            price = item.get('unit_price_at_sale', 0.0)
            p.text(f"{qty}x {name[:15]:<15} {qty*price:>10.2f}\n")
            
        p.text("-" * 32 + "\n")
        p.text(f"Subtotal:      {order_data.get('subtotal', 0.0):>10.2f}\n")
        p.text(f"CGST (2.5%):   {float(order_data.get('tax_total', 0.0))/2:>10.2f}\n")
        p.text(f"SGST (2.5%):   {float(order_data.get('tax_total', 0.0))/2:>10.2f}\n")
        p.set(align='right', text_type='B')
        p.text(f"Total:         {order_data.get('net_total', 0.0):>10.2f}\n")
        p.set(align='left', text_type='normal')
        
        p.text("\nThank you for visiting!\n\n")
        p.cut()
        
        # RJ11 Cash Drawer Kick only for CASH
        if order_data.get('payment_method') == 'CASH':
            p.cashdraw(2)
            
        logger.info(f"Successfully sent order {order_data.get('display_id')} to hardware buffer.")
            
    except Exception as e:
        logger.error(f"Error during printing job: {e}")
