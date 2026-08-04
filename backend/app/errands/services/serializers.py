from app.errands.models.task import Task
from app.errands.models.user import User, UserRole
from app.errands.schemas.task import CustomerBrief, RunnerBrief, TaskOut


def _can_see_contact(task: Task, viewer: User | None) -> bool:
    """Customer contact is private — only the owner, the assigned runner, or an
    admin may see the client's name and phone. Public tracking never does."""
    if viewer is None:
        return False
    if viewer.role == UserRole.admin:
        return True
    return viewer.id in (task.customer_id, task.runner_id)


def task_to_out(db, task: Task, viewer: User | None = None) -> TaskOut:
    runner = None
    if task.runner_id:
        ru = db.get(User, task.runner_id)
        if ru:
            prof = ru.runner_profile
            runner = RunnerBrief(
                id=ru.id,
                full_name=ru.full_name,
                suburb=prof.suburb if prof else None,
                rating_avg=prof.rating_avg if prof else None,
                rating_count=prof.rating_count if prof else None,
            )

    expose_contact = _can_see_contact(task, viewer)
    customer = None
    if expose_contact:
        cust = db.get(User, task.customer_id)
        if cust:
            customer = CustomerBrief(
                full_name=cust.full_name,
                phone=task.contact_phone or cust.phone,
            )

    return TaskOut(
        id=task.id,
        reference=task.reference,
        service_name=task.service_type.name,
        vertical=task.service_type.vertical,
        category=task.service_type.category,
        status=task.status,
        pickup_location=task.pickup_location,
        dropoff_location=task.dropoff_location,
        contact_phone=(task.contact_phone or None) if expose_contact else None,
        distance_km=task.distance_km,
        urgency=task.urgency,
        notes=task.notes,
        # A cleaning booking's address and access notes describe where someone
        # lives and how to get in. Same rule as the phone number: owner,
        # assigned crew and admin only — never on public reference tracking.
        service_address=task.service_address if expose_contact else "",
        access_notes=task.access_notes if expose_contact else "",
        scheduled_date=task.scheduled_date,
        arrival_window=task.arrival_window,
        frequency=task.frequency,
        bedrooms=task.bedrooms,
        bathrooms=task.bathrooms,
        quantity=task.quantity,
        extras=task.extras,
        base_price=task.base_price,
        distance_fee=task.distance_fee,
        urgency_fee=task.urgency_fee,
        size_fee=task.size_fee,
        extras_fee=task.extras_fee,
        frequency_discount=task.frequency_discount,
        service_fee=task.service_fee,
        total_price=task.total_price,
        proof_photo_url=task.proof_photo_url,
        proof_note=task.proof_note,
        runner=runner,
        customer=customer,
        payment_status=task.payment.payment_status.value if task.payment else None,
        created_at=task.created_at,
    )
