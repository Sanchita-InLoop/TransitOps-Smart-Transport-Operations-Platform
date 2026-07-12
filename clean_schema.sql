--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: driver_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.driver_status AS ENUM (
    'available',
    'on_trip',
    'off_duty',
    'suspended'
);


ALTER TYPE public.driver_status OWNER TO postgres;

--
-- Name: maintenance_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.maintenance_status AS ENUM (
    'open',
    'closed'
);


ALTER TYPE public.maintenance_status OWNER TO postgres;

--
-- Name: trip_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.trip_status AS ENUM (
    'draft',
    'dispatched',
    'completed',
    'cancelled'
);


ALTER TYPE public.trip_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'fleet_manager',
    'driver',
    'safety_officer',
    'financial_analyst'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: vehicle_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.vehicle_status AS ENUM (
    'available',
    'on_trip',
    'in_shop',
    'retired'
);


ALTER TYPE public.vehicle_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: drivers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.drivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    license_number character varying(50) NOT NULL,
    license_category character varying(20) NOT NULL,
    license_expiry_date date NOT NULL,
    contact_number character varying(20) NOT NULL,
    safety_score smallint DEFAULT 100 NOT NULL,
    status public.driver_status DEFAULT 'available'::public.driver_status NOT NULL,
    CONSTRAINT chk_drivers_safety_score_range CHECK (((safety_score >= 0) AND (safety_score <= 100)))
);


ALTER TABLE public.drivers OWNER TO postgres;

--
-- Name: TABLE drivers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.drivers IS 'Licensed drivers as an operational/compliance resource. UUID PK chosen (matching users) because driver records are personnel data that may be referenced externally (e.g., a driver-facing mobile app) and should not expose a guessable sequential identifier.';


--
-- Name: COLUMN drivers.license_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.drivers.license_number IS 'UNIQUE constraint enforces the real-world fact that a driving license number uniquely identifies one licensed individual ├óΓé¼ΓÇ¥ blocks duplicate driver profiles for the same person.';


--
-- Name: COLUMN drivers.license_expiry_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.drivers.license_expiry_date IS 'DATE (not TIMESTAMPTZ) because license validity is a calendar-day concept, not a point-in-time instant. Application/reporting layer is expected to alert safety_officers before expiry ├óΓé¼ΓÇ¥ enforced here structurally by making the field mandatory.';


--
-- Name: COLUMN drivers.safety_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.drivers.safety_score IS 'CHECK (BETWEEN 0 AND 100) models this as a bounded percentage/index ├óΓé¼ΓÇ¥ guarantees no report or dispatch-eligibility rule can ever be corrupted by an out-of-range score (e.g., a buggy decrement taking it to -5).';


--
-- Name: COLUMN drivers.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.drivers.status IS 'Native ENUM mirrors vehicle_status in spirit ├óΓé¼ΓÇ¥ drives driver-availability/dispatch matching and is validated at the DB layer to avoid free-text drift.';


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id bigint NOT NULL,
    vehicle_id bigint NOT NULL,
    type character varying(50) NOT NULL,
    amount numeric(12,2) NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT chk_expenses_amount_nonnegative CHECK ((amount >= (0)::numeric))
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: TABLE expenses; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.expenses IS 'Miscellaneous per-vehicle operating expenses (tolls, fines, parking, etc.) not already captured by maintenance_logs or fuel_logs ├óΓé¼ΓÇ¥ kept as a catch-all financial ledger for financial_analyst reporting.';


--
-- Name: COLUMN expenses.vehicle_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.expenses.vehicle_id IS 'ON DELETE RESTRICT, consistent with every other financial/audit child table in this schema ├óΓé¼ΓÇ¥ expense history must never be silently lost.';


--
-- Name: COLUMN expenses.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.expenses.type IS 'Deliberately kept as VARCHAR rather than an ENUM: expense categories (toll, parking, fine, misc, ...) are expected to grow/change far more often than the core operational statuses, so a rigid ENUM would create migration friction disproportionate to the benefit.';


--
-- Name: COLUMN expenses.amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.expenses.amount IS 'CHECK (>= 0): an expense cannot be negative (refunds/credits, if needed, should be modeled as a separate signed ledger entry or negative-type row, not a negative amount here).';


--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.expenses ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.expenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fuel_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fuel_logs (
    id bigint NOT NULL,
    vehicle_id bigint NOT NULL,
    trip_id bigint,
    liters numeric(10,2) NOT NULL,
    cost numeric(12,2) NOT NULL,
    log_date date DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT chk_fuel_logs_cost_nonnegative CHECK ((cost >= (0)::numeric)),
    CONSTRAINT chk_fuel_logs_liters_positive CHECK ((liters > (0)::numeric))
);


ALTER TABLE public.fuel_logs OWNER TO postgres;

--
-- Name: TABLE fuel_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.fuel_logs IS 'Refueling events. Modeled independently of trips (rather than as columns on trips) because a vehicle can refuel multiple times per trip, or outside any trip entirely (depot top-up, pre-positioning) ├óΓé¼ΓÇ¥ a 1:many relationship that a single trip.fuel_consumed column cannot capture on its own.';


--
-- Name: COLUMN fuel_logs.vehicle_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fuel_logs.vehicle_id IS 'NOT NULL and ON DELETE RESTRICT: every refuel event must belong to exactly one vehicle, and that link must survive for fuel-efficiency/cost auditing even if trip_id is absent.';


--
-- Name: COLUMN fuel_logs.trip_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fuel_logs.trip_id IS 'Nullable FK, unlike vehicle_id: refueling is not always tied to an active trip. ON DELETE RESTRICT still applies once set, so a fuel record can never be left pointing at a deleted trip.';


--
-- Name: COLUMN fuel_logs.liters; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fuel_logs.liters IS 'CHECK (> 0): a fuel log row only exists to record an actual refueling event, so zero/negative liters is rejected outright.';


--
-- Name: fuel_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.fuel_logs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.fuel_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: maintenance_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_logs (
    id bigint NOT NULL,
    vehicle_id bigint NOT NULL,
    description text NOT NULL,
    cost numeric(12,2) NOT NULL,
    status public.maintenance_status DEFAULT 'open'::public.maintenance_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    CONSTRAINT chk_maintenance_logs_closed_at_requires_closed_status CHECK (((closed_at IS NULL) OR (status = 'closed'::public.maintenance_status))),
    CONSTRAINT chk_maintenance_logs_cost_nonnegative CHECK ((cost >= (0)::numeric))
);


ALTER TABLE public.maintenance_logs OWNER TO postgres;

--
-- Name: TABLE maintenance_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.maintenance_logs IS 'Service/repair history per vehicle ├óΓé¼ΓÇ¥ feeds both safety compliance (is a vehicle currently in_shop?) and total-cost-of-ownership financial reporting.';


--
-- Name: COLUMN maintenance_logs.vehicle_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.maintenance_logs.vehicle_id IS 'ON DELETE RESTRICT: maintenance history is a compliance/financial record (e.g., proving a vehicle was serviced before an incident); it must outlive any accidental attempt to delete the vehicle row.';


--
-- Name: COLUMN maintenance_logs.cost; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.maintenance_logs.cost IS 'CHECK (>= 0): a repair cannot have negative cost. NUMERIC used for exact financial arithmetic, consistent with acquisition_cost.';


--
-- Name: COLUMN maintenance_logs.closed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.maintenance_logs.closed_at IS 'Mirrors the trips.completed_at pattern: nullable, and constrained so a closed_at timestamp can only exist once status = ''closed'' ├óΓé¼ΓÇ¥ keeps the open/closed lifecycle internally consistent.';


--
-- Name: maintenance_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.maintenance_logs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.maintenance_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: trips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trips (
    id bigint NOT NULL,
    vehicle_id bigint NOT NULL,
    driver_id uuid NOT NULL,
    source character varying(255) NOT NULL,
    destination character varying(255) NOT NULL,
    cargo_weight numeric(10,2) NOT NULL,
    planned_distance numeric(10,2) NOT NULL,
    actual_distance numeric(10,2),
    fuel_consumed numeric(10,2),
    status public.trip_status DEFAULT 'draft'::public.trip_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT chk_trips_actual_distance_nonnegative CHECK (((actual_distance IS NULL) OR (actual_distance >= (0)::numeric))),
    CONSTRAINT chk_trips_cargo_weight_positive CHECK ((cargo_weight > (0)::numeric)),
    CONSTRAINT chk_trips_completed_at_requires_completed_status CHECK (((completed_at IS NULL) OR (status = 'completed'::public.trip_status))),
    CONSTRAINT chk_trips_fuel_consumed_nonnegative CHECK (((fuel_consumed IS NULL) OR (fuel_consumed >= (0)::numeric))),
    CONSTRAINT chk_trips_planned_distance_positive CHECK ((planned_distance > (0)::numeric))
);


ALTER TABLE public.trips OWNER TO postgres;

--
-- Name: TABLE trips; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.trips IS 'Core operational fact table ├óΓé¼ΓÇ¥ one row per dispatched journey. BIGINT IDENTITY PK is used since trips are the highest-volume transactional table in the schema and will be the primary join target for reporting/analytics.';


--
-- Name: COLUMN trips.vehicle_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.vehicle_id IS 'ON DELETE RESTRICT: a vehicle with trip history is a permanent operational/financial record. Deleting the vehicle row would silently orphan or destroy that history ├óΓé¼ΓÇ¥ instead, the app must explicitly retire the vehicle (status = ''retired'') rather than delete it.';


--
-- Name: COLUMN trips.driver_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.driver_id IS 'ON DELETE RESTRICT for the same reason as vehicle_id ├óΓé¼ΓÇ¥ a driver''s trip history feeds safety/performance scoring and must never be deletable out from under existing trips. Off-boarding a driver should update drivers.status, not delete the row.';


--
-- Name: COLUMN trips.cargo_weight; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.cargo_weight IS 'CHECK (> 0), strictly greater than zero (not >= 0) because a trip with zero cargo is not a freight movement ├óΓé¼ΓÇ¥ this enforces that every trip row represents an actual load-bearing journey per the business rule as specified.';


--
-- Name: COLUMN trips.planned_distance; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.planned_distance IS 'CHECK (> 0): a trip must have a nonzero planned route; this is set at trip creation (draft/dispatch time) before actual_distance is known.';


--
-- Name: COLUMN trips.actual_distance; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.actual_distance IS 'Nullable: unknown until the trip is underway/completed. Allowed to be exactly 0 (unlike planned_distance) to accommodate a dispatched trip that is cancelled before departure.';


--
-- Name: COLUMN trips.completed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.completed_at IS 'Nullable ├óΓé¼ΓÇ¥ only populated once status transitions to ''completed''. A CHECK constraint enforces this pairing so a trip can never show a completion timestamp while still in draft/dispatched/cancelled state.';


--
-- Name: trips_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.trips ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.trips_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'Platform staff accounts (fleet managers, safety officers, financial analysts, and driver-role logins). UUID PK chosen so account identifiers are non-sequential and cannot be enumerated/guessed by scanning integer IDs ├óΓé¼ΓÇ¥ important since this table holds authentication credentials.';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.email IS 'UNIQUE constraint enforces one account per email address, which doubles as the natural login identifier ├óΓé¼ΓÇ¥ prevents duplicate signups and supports email-based password reset flows.';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.password_hash IS 'Stores a salted hash (e.g., bcrypt/argon2) only ├óΓé¼ΓÇ¥ the platform must never persist plaintext passwords. Named _hash explicitly to make this contract unmistakable in code review.';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.role IS 'Native ENUM restricts every account to exactly one of four known operational roles, enforced at the database level regardless of application-layer bugs.';


--
-- Name: COLUMN users.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.created_at IS 'TIMESTAMPTZ (not TIMESTAMP) is used throughout this schema to store instants unambiguously across time zones ├óΓé¼ΓÇ¥ critical for a transport platform whose vehicles/trips may span regions.';


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicles (
    id bigint NOT NULL,
    registration_number character varying(20) NOT NULL,
    model_name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    max_load_capacity numeric(10,2) NOT NULL,
    odometer numeric(12,2) DEFAULT 0 NOT NULL,
    acquisition_cost numeric(14,2) NOT NULL,
    status public.vehicle_status DEFAULT 'available'::public.vehicle_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_vehicles_acquisition_cost_nonnegative CHECK ((acquisition_cost >= (0)::numeric)),
    CONSTRAINT chk_vehicles_max_load_capacity_nonnegative CHECK ((max_load_capacity >= (0)::numeric)),
    CONSTRAINT chk_vehicles_odometer_nonnegative CHECK ((odometer >= (0)::numeric))
);


ALTER TABLE public.vehicles OWNER TO postgres;

--
-- Name: TABLE vehicles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.vehicles IS 'Fleet inventory. BIGINT IDENTITY PK used (rather than UUID) because vehicles are an internal operational asset referenced heavily by high-volume child tables (trips, fuel_logs, expenses) ├óΓé¼ΓÇ¥ smaller integer keys keep those FK indexes compact and fast.';


--
-- Name: COLUMN vehicles.registration_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vehicles.registration_number IS 'UNIQUE constraint mirrors the real-world legal uniqueness of a vehicle registration/plate number ├óΓé¼ΓÇ¥ prevents the same physical vehicle from being registered twice by data-entry error.';


--
-- Name: COLUMN vehicles.max_load_capacity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vehicles.max_load_capacity IS 'CHECK (>= 0): a vehicle cannot have negative carrying capacity; a physically nonsensical value is rejected at the data layer, not just validated in application code.';


--
-- Name: COLUMN vehicles.odometer; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vehicles.odometer IS 'CHECK (>= 0): odometer readings are cumulative and can never be negative. NUMERIC (not FLOAT) is used to avoid floating-point rounding drift over a vehicle''s multi-year, high-mileage lifetime.';


--
-- Name: COLUMN vehicles.acquisition_cost; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vehicles.acquisition_cost IS 'NUMERIC(14,2) for exact financial precision (never use FLOAT/DOUBLE for money ├óΓé¼ΓÇ¥ rounding errors compound over the asset lifecycle and financial_analyst reporting depends on exactness).';


--
-- Name: COLUMN vehicles.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vehicles.status IS 'Native ENUM drives fleet-availability logic (e.g., dispatch queries filter status = ''available''); keeping it as a constrained type prevents typos like ''availble'' from silently breaking dispatch queries.';


--
-- Name: vehicles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.vehicles ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.vehicles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: fuel_logs fuel_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fuel_logs_pkey PRIMARY KEY (id);


--
-- Name: maintenance_logs maintenance_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_pkey PRIMARY KEY (id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: drivers uq_drivers_license_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT uq_drivers_license_number UNIQUE (license_number);


--
-- Name: users uq_users_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_email UNIQUE (email);


--
-- Name: vehicles uq_vehicles_registration_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT uq_vehicles_registration_number UNIQUE (registration_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: idx_drivers_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_drivers_status ON public.drivers USING btree (status);


--
-- Name: idx_expenses_vehicle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_vehicle_id ON public.expenses USING btree (vehicle_id);


--
-- Name: idx_fuel_logs_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fuel_logs_trip_id ON public.fuel_logs USING btree (trip_id);


--
-- Name: idx_fuel_logs_vehicle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fuel_logs_vehicle_id ON public.fuel_logs USING btree (vehicle_id);


--
-- Name: idx_maintenance_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_logs_status ON public.maintenance_logs USING btree (status);


--
-- Name: idx_maintenance_logs_vehicle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_logs_vehicle_id ON public.maintenance_logs USING btree (vehicle_id);


--
-- Name: idx_trips_driver_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_driver_id ON public.trips USING btree (driver_id);


--
-- Name: idx_trips_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_status ON public.trips USING btree (status);


--
-- Name: idx_trips_vehicle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_vehicle_id ON public.trips USING btree (vehicle_id);


--
-- Name: idx_vehicles_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vehicles_status ON public.vehicles USING btree (status);


--
-- Name: expenses fk_expenses_vehicle; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_vehicle FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT;


--
-- Name: fuel_logs fk_fuel_logs_trip; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fk_fuel_logs_trip FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE RESTRICT;


--
-- Name: fuel_logs fk_fuel_logs_vehicle; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fk_fuel_logs_vehicle FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT;


--
-- Name: maintenance_logs fk_maintenance_logs_vehicle; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT fk_maintenance_logs_vehicle FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT;


--
-- Name: trips fk_trips_driver; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT fk_trips_driver FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE RESTRICT;


--
-- Name: trips fk_trips_vehicle; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT fk_trips_vehicle FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--


